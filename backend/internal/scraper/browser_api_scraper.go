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
	Locations  []models.Location
	SiteID     string
	BaseURL    string
	ChromePath string
	MaxRetries int
}

type periodsResponse struct {
	LocationID string           `json:"locationId"`
	Date       string           `json:"date"`
	Periods    []models.Service `json:"periods"`
}

func NewBrowserAPIScraper() *BrowserAPIScraper {
	return &BrowserAPIScraper{
		Locations:  DefaultConfig.Locations,
		SiteID:     DefaultConfig.SiteID,
		BaseURL:    DefaultConfig.BaseURL,
		ChromePath: resolveChromePath(),
		MaxRetries: 3,
	}
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
	allocOpts := s.browserAllocatorOptions()
	allocCtx, cancelAlloc := chromedp.NewExecAllocator(context.Background(), allocOpts...)
	defer cancelAlloc()

	var dailyItems []models.DailyItem
	var allDataItems []models.AllDataItem
	allClosed := true
	fetchSucceeded := false

	for _, location := range s.Locations {
		var services []models.Service
		periodURL := fmt.Sprintf("%s/locations/%s/periods/?date=%s", s.BaseURL, location.Hash, date)
		err := s.withRetry("fetch_periods", func() error {
			var periods periodsResponse
			if err := s.fetchJSONWithNewTab(allocCtx, periodURL, &periods, 20*time.Second); err != nil {
				return err
			}

			services = periods.Periods
			return nil
		})
		if err != nil {
			log.Printf("browser-api failed to fetch periods for %s: %v", location.Name, err)
			continue
		}
		fetchSucceeded = true

		for _, service := range services {
			menuURL := fmt.Sprintf("%s/locations/%s/menu?date=%s&period=%s", s.BaseURL, location.Hash, date, service.ID)
			var menu models.DiningHallResponse

			err := s.withRetry("fetch_menu", func() error {
				return s.fetchJSONWithNewTab(allocCtx, menuURL, &menu, 25*time.Second)
			})
			if err != nil {
				log.Printf("browser-api failed menu fetch for %s (%s): %v", location.Name, service.TimeOfDay, err)
				continue
			}
			fetchSucceeded = true

			dItems, aItems, err := parseItems(menu, location.Name, service.TimeOfDay)
			if err != nil {
				log.Printf("browser-api failed to parse menu for %s (%s): %v", location.Name, service.TimeOfDay, err)
				continue
			}

			if len(dItems) > 0 {
				allClosed = false
			}

			dailyItems = append(dailyItems, dItems...)
			allDataItems = append(allDataItems, aItems...)
		}
	}

	if fetchSucceeded {
		log.Printf("browser-api scrape completed for date=%s daily_items=%d all_data_items=%d", date, len(dailyItems), len(allDataItems))
		return dailyItems, allDataItems, allClosed, nil
	}

	return nil, nil, true, fmt.Errorf("browser-api scrape had no successful fetches for date=%s", date)
}

func (s *BrowserAPIScraper) ScrapeLocationOperatingTimes(date string) ([]models.LocationOperatingTimes, error) {
	allocOpts := s.browserAllocatorOptions()
	allocCtx, cancelAlloc := chromedp.NewExecAllocator(context.Background(), allocOpts...)
	defer cancelAlloc()

	url := fmt.Sprintf("%s/locations/weekly_schedule?site_id=%s&date=%s", s.BaseURL, s.SiteID, date)

	var resp models.LocationOperationsResponse
	err := s.withRetry("fetch_weekly_schedule", func() error {
		return s.fetchJSONWithNewTab(allocCtx, url, &resp, 25*time.Second)
	})
	if err != nil {
		return nil, fmt.Errorf("browser-api failed operation-hours fetch for date=%s: %w", date, err)
	}

	return parseLocationOperatingTimes(resp.Locations)
}

func (s *BrowserAPIScraper) fetchJSONWithNewTab(allocCtx context.Context, url string, target any, timeout time.Duration) error {
	tabCtx, cancelTab := chromedp.NewContext(allocCtx)
	defer cancelTab()

	callCtx, cancel := context.WithTimeout(tabCtx, timeout)
	defer cancel()

	return fetchJSONInBrowser(callCtx, url, target)
}

func (s *BrowserAPIScraper) browserAllocatorOptions() []chromedp.ExecAllocatorOption {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", "new"),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.UserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"),
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

func fetchJSONInBrowser(ctx context.Context, url string, target any) error {
	var preText string
	var bodyText string

	err := chromedp.Run(ctx,
		chromedp.Navigate(url),
		chromedp.WaitVisible("body", chromedp.ByQuery),
		chromedp.Sleep(1200*time.Millisecond),
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

	if strings.Contains(strings.ToLower(bodyText), "cloudflare") || strings.Contains(bodyText, "Attention Required!") {
		return &BrowserFetchError{Class: ErrCloudflareChallenge, URL: url, Message: truncate(bodyText, 180)}
	}

	err = chromedp.Run(ctx, chromedp.Text("pre", &preText, chromedp.ByQuery))
	if err != nil {
		return &BrowserFetchError{Class: ErrJSONParse, URL: url, Message: "missing <pre> json payload"}
	}

	if !json.Valid([]byte(preText)) {
		return &BrowserFetchError{Class: ErrJSONParse, URL: url, Message: truncate(preText, 180)}
	}

	if err := json.Unmarshal([]byte(preText), target); err != nil {
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
