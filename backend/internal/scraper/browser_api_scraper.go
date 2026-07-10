package scraper

import (
	"backend/internal/models"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/chromedp/cdproto/browser"
	"github.com/chromedp/cdproto/emulation"
	"github.com/chromedp/chromedp"
)

type FetchErrorClass string

const (
	ErrBrowserLaunch       FetchErrorClass = "browser_launch"
	ErrNavigationTimeout   FetchErrorClass = "navigation_timeout"
	ErrCloudflareChallenge FetchErrorClass = "cloudflare_challenge"
	ErrJSONParse           FetchErrorClass = "json_parse"
	ErrNetwork             FetchErrorClass = "network"
)

type BrowserFetchError struct {
	Class   FetchErrorClass
	URL     string
	Message string
}

func (e *BrowserFetchError) Error() string {
	return fmt.Sprintf("%s (%s): %s", e.Class, e.URL, e.Message)
}

type BrowserAPIScraper struct {
	Locations    []models.Location
	SiteID       string
	BaseURL      string
	ChromePath   string
	BrowserWSURL string
	UserAgent    string
	MaxRetries   int
}

type periodsResponse struct {
	LocationID string           `json:"locationId"`
	Date       string           `json:"date"`
	Periods    []models.Service `json:"periods"`
}

func NewBrowserAPIScraper() *BrowserAPIScraper {
	return &BrowserAPIScraper{
		Locations:    DefaultConfig.Locations,
		SiteID:       DefaultConfig.SiteID,
		BaseURL:      DefaultConfig.BaseURL,
		ChromePath:   resolveChromePath(),
		BrowserWSURL: resolveBrowserWSURL(),
		UserAgent:    strings.TrimSpace(os.Getenv("SCRAPER_USER_AGENT")),
		MaxRetries:   3,
	}
}

func resolveBrowserWSURL() string {
	for _, envName := range []string{"BROWSERLESS_WS_URL", "BROWSER_WS_ENDPOINT"} {
		if endpoint := strings.TrimSpace(os.Getenv(envName)); endpoint != "" {
			return endpoint
		}
	}

	return ""
}

func resolveChromePath() string {
	if bin := os.Getenv("CHROME_BIN"); bin != "" {
		return bin
	}

	candidates := []string{
		"/usr/bin/chromium",
		"/usr/bin/chromium-browser",
		"/usr/bin/google-chrome",
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	return ""
}

func (s *BrowserAPIScraper) ScrapeFood(date string) ([]models.DailyItem, []models.AllDataItem, bool, error) {
	browserCtx, cancelBrowser, err := s.newBrowserSession(context.Background())
	if err != nil {
		return nil, nil, true, err
	}
	defer cancelBrowser()

	var dailyItems []models.DailyItem
	var allDataItems []models.AllDataItem
	allClosed := true
	fetchSucceeded := false
	var fetchErrors []error

	for _, location := range s.Locations {
		periodURL := fmt.Sprintf("%s/locations/%s/periods/?date=%s", s.BaseURL, location.Hash, date)
		scrapedServiceKeys := make(map[string]struct{})

		for {
			services, err := s.fetchPeriods(browserCtx, periodURL)
			if err != nil {
				log.Printf("browser-api failed to fetch periods for %s: %v", location.Name, err)
				fetchErrors = append(fetchErrors, fmt.Errorf("%s periods: %w", location.Name, err))
				break
			}
			fetchSucceeded = true

			service, ok := pickNextService(services, scrapedServiceKeys)
			if !ok {
				break
			}

			menuURL := fmt.Sprintf("%s/locations/%s/menu?date=%s&period=%s", s.BaseURL, location.Hash, date, service.ID)
			var menu models.DiningHallResponse

			err = s.withRetry("fetch_menu", func() error {
				return s.fetchJSONWithNewTab(browserCtx, menuURL, &menu, 25*time.Second)
			})
			if err != nil {
				log.Printf("browser-api failed menu fetch for %s (%s): %v", location.Name, service.TimeOfDay, err)
				fetchErrors = append(fetchErrors, fmt.Errorf("%s %s menu: %w", location.Name, service.TimeOfDay, err))
				scrapedServiceKeys[serviceKey(service)] = struct{}{}
				continue
			}
			fetchSucceeded = true

			dItems, aItems, err := parseItems(menu, location.Name, service.TimeOfDay)
			if err != nil {
				log.Printf("browser-api failed to parse menu for %s (%s): %v", location.Name, service.TimeOfDay, err)
				fetchErrors = append(fetchErrors, fmt.Errorf("%s %s parse: %w", location.Name, service.TimeOfDay, err))
				scrapedServiceKeys[serviceKey(service)] = struct{}{}
				continue
			}

			if len(dItems) > 0 {
				allClosed = false
			}

			dailyItems = append(dailyItems, dItems...)
			allDataItems = append(allDataItems, aItems...)
			scrapedServiceKeys[serviceKey(service)] = struct{}{}
		}
	}

	if len(fetchErrors) > 0 {
		return dailyItems, allDataItems, allClosed, fmt.Errorf(
			"browser-api scrape incomplete for date=%s: %w",
			date,
			errors.Join(fetchErrors...),
		)
	}

	if fetchSucceeded {
		log.Printf("browser-api scrape completed for date=%s daily_items=%d all_data_items=%d", date, len(dailyItems), len(allDataItems))
		return dailyItems, allDataItems, allClosed, nil
	}

	return nil, nil, true, fmt.Errorf("browser-api scrape had no successful fetches for date=%s", date)
}

func (s *BrowserAPIScraper) fetchPeriods(browserCtx context.Context, periodURL string) ([]models.Service, error) {
	var services []models.Service

	err := s.withRetry("fetch_periods", func() error {
		var periods periodsResponse
		if err := s.fetchJSONWithNewTab(browserCtx, periodURL, &periods, 20*time.Second); err != nil {
			return err
		}

		services = periods.Periods
		return nil
	})
	if err != nil {
		return nil, err
	}

	return services, nil
}

func (s *BrowserAPIScraper) ScrapeLocationOperatingTimes(date string) ([]models.LocationOperatingTimes, error) {
	browserCtx, cancelBrowser, err := s.newBrowserSession(context.Background())
	if err != nil {
		return nil, err
	}
	defer cancelBrowser()

	url := fmt.Sprintf("%s/locations/weekly_schedule?site_id=%s&date=%s", s.BaseURL, s.SiteID, date)

	var resp models.LocationOperationsResponse
	err = s.withRetry("fetch_weekly_schedule", func() error {
		return s.fetchJSONWithNewTab(browserCtx, url, &resp, 25*time.Second)
	})
	if err != nil {
		return nil, fmt.Errorf("browser-api failed operation-hours fetch for date=%s: %w", date, err)
	}

	return parseLocationOperatingTimes(resp.Locations)
}

func (s *BrowserAPIScraper) newBrowserSession(parent context.Context) (context.Context, context.CancelFunc, error) {
	var (
		allocCtx    context.Context
		cancelAlloc context.CancelFunc
	)

	if s.BrowserWSURL != "" {
		allocCtx, cancelAlloc = chromedp.NewRemoteAllocator(parent, s.BrowserWSURL, chromedp.NoModifyURL)
	} else {
		allocCtx, cancelAlloc = chromedp.NewExecAllocator(parent, s.browserAllocatorOptions()...)
	}

	browserCtx, cancelBrowser := chromedp.NewContext(allocCtx)

	if err := chromedp.Run(browserCtx); err != nil {
		cancelBrowser()
		cancelAlloc()
		return nil, func() {}, &BrowserFetchError{
			Class:   ErrBrowserLaunch,
			URL:     s.BaseURL,
			Message: err.Error(),
		}
	}

	cancel := func() {
		cancelBrowser()
		cancelAlloc()
	}
	return browserCtx, cancel, nil
}

func (s *BrowserAPIScraper) fetchJSONWithNewTab(browserCtx context.Context, url string, target any, timeout time.Duration) error {
	tabCtx, cancelTab := chromedp.NewContext(browserCtx)
	defer cancelTab()

	callCtx, cancel := context.WithTimeout(tabCtx, timeout)
	defer cancel()

	return fetchJSONInBrowser(callCtx, url, target, s.UserAgent)
}

func (s *BrowserAPIScraper) browserAllocatorOptions() []chromedp.ExecAllocatorOption {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", "new"),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
	)

	if s.ChromePath != "" {
		opts = append(opts, chromedp.ExecPath(s.ChromePath))
	}

	return opts
}

func (s *BrowserAPIScraper) withRetry(operation string, fn func() error) error {
	retries := s.MaxRetries
	if retries < 1 {
		retries = 1
	}

	var lastErr error
	for attempt := 1; attempt <= retries; attempt++ {
		lastErr = fn()
		if lastErr == nil {
			return nil
		}

		log.Printf("browser-api operation=%s attempt=%d/%d class=%s err=%v", operation, attempt, retries, classifyFetchError(lastErr), lastErr)
		if attempt < retries {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}

	return lastErr
}

func fetchJSONInBrowser(ctx context.Context, url string, target any, configuredUserAgent string) error {
	var bodyText string

	err := chromedp.Run(ctx,
		chromedp.ActionFunc(func(ctx context.Context) error {
			userAgent := configuredUserAgent
			if userAgent == "" {
				_, _, _, browserUserAgent, _, err := browser.GetVersion().Do(ctx)
				if err != nil {
					return err
				}
				userAgent = strings.Replace(browserUserAgent, "HeadlessChrome", "Chrome", 1)
			}

			return emulation.SetUserAgentOverride(userAgent).
				WithAcceptLanguage("en-US,en;q=0.9").
				Do(ctx)
		}),
		chromedp.Navigate(url),
		chromedp.WaitReady("body", chromedp.ByQuery),
		chromedp.Text("body", &bodyText, chromedp.ByQuery),
	)
	if err != nil {
		errLower := strings.ToLower(err.Error())
		if strings.Contains(errLower, "failed to start") || strings.Contains(errLower, "chrome failed to start") {
			return &BrowserFetchError{Class: ErrBrowserLaunch, URL: url, Message: err.Error()}
		}
		if errors.Is(err, context.DeadlineExceeded) {
			return &BrowserFetchError{Class: ErrNavigationTimeout, URL: url, Message: err.Error()}
		}
		return &BrowserFetchError{Class: ErrNetwork, URL: url, Message: err.Error()}
	}

	return decodeBrowserJSON(url, bodyText, target)
}

func decodeBrowserJSON(url, bodyText string, target any) error {
	payload := strings.TrimSpace(bodyText)
	lowerBody := strings.ToLower(payload)
	if strings.Contains(lowerBody, "cloudflare") ||
		strings.Contains(lowerBody, "attention required!") ||
		strings.Contains(lowerBody, "sorry, you have been blocked") {
		return &BrowserFetchError{Class: ErrCloudflareChallenge, URL: url, Message: truncate(payload, 180)}
	}

	if !json.Valid([]byte(payload)) {
		return &BrowserFetchError{Class: ErrJSONParse, URL: url, Message: truncate(payload, 180)}
	}

	if err := json.Unmarshal([]byte(payload), target); err != nil {
		return &BrowserFetchError{Class: ErrJSONParse, URL: url, Message: err.Error()}
	}

	return nil
}

func classifyFetchError(err error) FetchErrorClass {
	var fetchErr *BrowserFetchError
	if errors.As(err, &fetchErr) {
		return fetchErr.Class
	}

	if errors.Is(err, context.DeadlineExceeded) {
		return ErrNavigationTimeout
	}

	return ErrNetwork
}

func truncate(s string, limit int) string {
	if len(s) <= limit {
		return s
	}
	return s[:limit]
}

func pickNextService(services []models.Service, seen map[string]struct{}) (models.Service, bool) {
	orderedMeals := []string{"breakfast", "lunch", "dinner"}

	for _, meal := range orderedMeals {
		for _, service := range services {
			if strings.EqualFold(strings.TrimSpace(service.TimeOfDay), meal) {
				key := serviceKey(service)
				if _, ok := seen[key]; !ok {
					return service, true
				}
			}
		}
	}

	for _, service := range services {
		key := serviceKey(service)
		if _, ok := seen[key]; !ok {
			return service, true
		}
	}

	return models.Service{}, false
}

func serviceKey(service models.Service) string {
	tod := strings.TrimSpace(strings.ToLower(service.TimeOfDay))
	if tod != "" {
		return "tod:" + tod
	}

	return "id:" + strings.TrimSpace(service.ID)
}
