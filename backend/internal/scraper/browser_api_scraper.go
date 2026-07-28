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

// DefaultMaxNavigationsPerSession bounds how many page navigations a single
// browser session performs before it is torn down and replaced. Browserless
// kills a session at 60s of wall time; each navigation costs a few seconds, so
// a long run (the daily 6-day scrape does ~90) must recycle or it dies
// mid-flight. Runs shorter than this threshold use exactly one session.
const DefaultMaxNavigationsPerSession = 12

type BrowserAPIScraper struct {
	Locations    []models.Location
	SiteID       string
	BaseURL      string
	ChromePath   string
	BrowserWSURL string
	UserAgent    string
	MaxRetries   int
	// MaxNavigationsPerSession overrides DefaultMaxNavigationsPerSession.
	MaxNavigationsPerSession int

	// LastSeenUpdatedAt records the upstream updatedAt stamp observed for every
	// (location, date, period) menu this scraper fetched. Callers copy it into
	// their longer-lived freshness tracker so the next refresh can skip menus
	// upstream has not edited.
	LastSeenUpdatedAt map[MenuKey]string
	// MenuUnchanged, when set, is consulted after a menu response is decoded but
	// before it is parsed. Returning true means "this exact menu was already
	// persisted", and the scraper skips parsing and reports the result as
	// Unchanged. Left nil by the daily full scrape so it always reparses.
	MenuUnchanged func(key MenuKey, updatedAt string) bool
}

// MenuKey identifies one upstream menu: a single meal period at one dining hall
// on one date. It is the granularity at which menus are fetched, persisted and
// freshness-tracked.
type MenuKey struct {
	Location string
	Date     string
	Period   string
}

type periodsResponse struct {
	LocationID string           `json:"locationId"`
	Date       string           `json:"date"`
	Periods    []models.Service `json:"periods"`
}

func NewBrowserAPIScraper() *BrowserAPIScraper {
	return &BrowserAPIScraper{
		Locations:         DefaultConfig.Locations,
		SiteID:            DefaultConfig.SiteID,
		BaseURL:           DefaultConfig.BaseURL,
		ChromePath:        resolveChromePath(),
		BrowserWSURL:      resolveBrowserWSURL(),
		UserAgent:         strings.TrimSpace(os.Getenv("SCRAPER_USER_AGENT")),
		MaxRetries:        3,
		LastSeenUpdatedAt: make(map[MenuKey]string),
	}
}

// recordUpdatedAt remembers the upstream edit stamp for a fetched menu.
func (s *BrowserAPIScraper) recordUpdatedAt(key MenuKey, updatedAt string) {
	if s.LastSeenUpdatedAt == nil {
		s.LastSeenUpdatedAt = make(map[MenuKey]string)
	}
	s.LastSeenUpdatedAt[key] = updatedAt
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
	session, err := s.newSession(context.Background())
	if err != nil {
		return nil, nil, true, err
	}
	defer session.close()

	var dailyItems []models.DailyItem
	var allDataItems []models.AllDataItem
	allClosed := true
	fetchSucceeded := false
	var fetchErrors []error

	for _, location := range s.Locations {
		// The period list for a (location, date) never changes mid-run, so it is
		// fetched once per location. The previous code re-fetched it on every
		// iteration of the period loop, costing 2P+1 navigations per location
		// instead of P+1.
		services, err := s.fetchPeriods(session, location, date)
		if err != nil {
			log.Printf("browser-api failed to fetch periods for %s: %v", location.Name, err)
			fetchErrors = append(fetchErrors, fmt.Errorf("%s periods: %w", location.Name, err))
			continue
		}
		fetchSucceeded = true

		scrapedServiceKeys := make(map[string]struct{})
		for {
			service, ok := pickNextService(services, scrapedServiceKeys)
			if !ok {
				break
			}
			scrapedServiceKeys[serviceKey(service)] = struct{}{}

			menu, err := s.fetchMenu(session, location, date, service)
			if err != nil {
				log.Printf("browser-api failed menu fetch for %s (%s): %v", location.Name, service.TimeOfDay, err)
				fetchErrors = append(fetchErrors, fmt.Errorf("%s %s menu: %w", location.Name, service.TimeOfDay, err))
				continue
			}
			fetchSucceeded = true

			dItems, aItems, err := parseItems(menu, location.Name, service.TimeOfDay)
			if err != nil {
				log.Printf("browser-api failed to parse menu for %s (%s): %v", location.Name, service.TimeOfDay, err)
				fetchErrors = append(fetchErrors, fmt.Errorf("%s %s parse: %w", location.Name, service.TimeOfDay, err))
				continue
			}

			if len(dItems) > 0 {
				allClosed = false
			}

			dailyItems = append(dailyItems, dItems...)
			allDataItems = append(allDataItems, aItems...)
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
		log.Printf("browser-api scrape completed for date=%s daily_items=%d all_data_items=%d navigations=%d recycles=%d",
			date, len(dailyItems), len(allDataItems), session.totalNavigations, session.recycles)
		return dailyItems, allDataItems, allClosed, nil
	}

	return nil, nil, true, fmt.Errorf("browser-api scrape had no successful fetches for date=%s", date)
}

// PeriodScrapeResult is one dining hall's outcome from a period-scoped scrape.
// Fetched reports whether the location's data was retrieved successfully, and
// is the only signal callers may use to decide whether stored rows for this
// location/period may be replaced — a failed fetch must never delete anything.
type PeriodScrapeResult struct {
	Location string
	// MatchedPeriod is the upstream period name that satisfied the requested
	// meal, which can differ from it ("Brunch" serves a "Lunch" request). Empty
	// when the location advertised no matching period.
	MatchedPeriod string
	// Fetched is true when both the period list and (if a period matched) the
	// menu were retrieved without error.
	Fetched bool
	// Matched is true when the location advertised a period for the requested
	// meal. A Fetched result with Matched false means "this hall serves no such
	// meal today", which legitimately clears stored rows for that slot.
	Matched bool
	// Unchanged is true when MenuUnchanged reported the upstream menu was
	// already persisted; DailyItems and AllItems are then not populated and the
	// caller must leave stored rows alone.
	Unchanged  bool
	UpdatedAt  string
	DailyItems []models.DailyItem
	AllItems   []models.AllDataItem
	Err        error
}

// ScrapePeriod fetches a single meal period for one date across every
// configured location: one navigation for the period list plus one for the
// matching period's menu, and no navigation at all for halls that do not serve
// the requested meal. Per-location failures are reported in the results rather
// than aborting the run, so one hall being down cannot stop the other four from
// refreshing.
//
// The returned error is non-nil only when no browser could be started at all.
func (s *BrowserAPIScraper) ScrapePeriod(date, meal string) ([]PeriodScrapeResult, error) {
	session, err := s.newSession(context.Background())
	if err != nil {
		return nil, err
	}
	defer session.close()

	results := make([]PeriodScrapeResult, 0, len(s.Locations))
	for _, location := range s.Locations {
		results = append(results, s.scrapeLocationPeriod(session, location, date, meal))
	}

	log.Printf(
		"browser-api period scrape complete date=%s meal=%s navigations=%d recycles=%d",
		date, meal, session.totalNavigations, session.recycles,
	)
	return results, nil
}

func (s *BrowserAPIScraper) scrapeLocationPeriod(session *browserSession, location models.Location, date, meal string) PeriodScrapeResult {
	result := PeriodScrapeResult{Location: location.Name}

	services, err := s.fetchPeriods(session, location, date)
	if err != nil {
		log.Printf("browser-api period refresh failed to fetch periods for %s: %v", location.Name, err)
		result.Err = fmt.Errorf("%s periods: %w", location.Name, err)
		return result
	}

	service, ok := pickServiceForMeal(services, meal)
	if !ok {
		// The hall published a period list that has no such meal: it is closed
		// for this slot today. This is a successful fetch, so the caller may
		// clear whatever it had stored for the slot.
		result.Fetched = true
		log.Printf("browser-api period refresh: %s serves no %s on %s", location.Name, meal, date)
		return result
	}

	result.Matched = true
	result.MatchedPeriod = strings.TrimSpace(service.TimeOfDay)

	menu, err := s.fetchMenu(session, location, date, service)
	if err != nil {
		log.Printf("browser-api period refresh failed menu fetch for %s (%s): %v", location.Name, result.MatchedPeriod, err)
		result.Err = fmt.Errorf("%s %s menu: %w", location.Name, result.MatchedPeriod, err)
		return result
	}
	result.Fetched = true
	result.UpdatedAt = menu.UpdatedAt

	key := MenuKey{Location: location.Name, Date: date, Period: result.MatchedPeriod}
	if s.MenuUnchanged != nil && s.MenuUnchanged(key, menu.UpdatedAt) {
		result.Unchanged = true
		log.Printf("browser-api period refresh: %s %s unchanged since %s", location.Name, result.MatchedPeriod, menu.UpdatedAt)
		return result
	}

	dItems, aItems, err := parseItems(menu, location.Name, result.MatchedPeriod)
	if err != nil {
		log.Printf("browser-api period refresh failed to parse menu for %s (%s): %v", location.Name, result.MatchedPeriod, err)
		result.Fetched = false
		result.Err = fmt.Errorf("%s %s parse: %w", location.Name, result.MatchedPeriod, err)
		return result
	}

	result.DailyItems = dItems
	result.AllItems = aItems
	return result
}

// pickServiceForMeal finds the period serving the requested meal. Matching is
// case-insensitive, and a hall running "Brunch" satisfies a "Lunch" request —
// weekend brunch replaces the normal lunch service. An exact name match always
// wins over the brunch alias so a hall listing both keeps them distinct.
func pickServiceForMeal(services []models.Service, meal string) (models.Service, bool) {
	target := strings.TrimSpace(strings.ToLower(meal))
	if target == "" {
		return models.Service{}, false
	}

	for _, service := range services {
		if strings.EqualFold(strings.TrimSpace(service.TimeOfDay), target) {
			return service, true
		}
	}

	if target == "lunch" {
		for _, service := range services {
			if strings.EqualFold(strings.TrimSpace(service.TimeOfDay), "brunch") {
				return service, true
			}
		}
	}

	return models.Service{}, false
}

// fetchPeriods lists the meal periods a location advertises for a date. One
// navigation (plus retries).
func (s *BrowserAPIScraper) fetchPeriods(session *browserSession, location models.Location, date string) ([]models.Service, error) {
	periodURL := fmt.Sprintf("%s/locations/%s/periods/?date=%s", s.BaseURL, location.Hash, date)

	var services []models.Service
	err := s.withRetry("fetch_periods", func() error {
		var periods periodsResponse
		if err := session.fetchJSON(periodURL, &periods, 20*time.Second); err != nil {
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

// fetchMenu retrieves one period's menu and records its upstream edit stamp.
// One navigation (plus retries).
func (s *BrowserAPIScraper) fetchMenu(session *browserSession, location models.Location, date string, service models.Service) (models.DiningHallResponse, error) {
	menuURL := fmt.Sprintf("%s/locations/%s/menu?date=%s&period=%s", s.BaseURL, location.Hash, date, service.ID)

	var menu models.DiningHallResponse
	err := s.withRetry("fetch_menu", func() error {
		menu = models.DiningHallResponse{}
		return session.fetchJSON(menuURL, &menu, 25*time.Second)
	})
	if err != nil {
		return models.DiningHallResponse{}, err
	}

	s.recordUpdatedAt(MenuKey{Location: location.Name, Date: date, Period: service.TimeOfDay}, menu.UpdatedAt)
	return menu, nil
}

func (s *BrowserAPIScraper) ScrapeLocationOperatingTimes(date string) ([]models.LocationOperatingTimes, error) {
	session, err := s.newSession(context.Background())
	if err != nil {
		return nil, err
	}
	defer session.close()

	url := fmt.Sprintf("%s/locations/weekly_schedule?site_id=%s&date=%s", s.BaseURL, s.SiteID, date)

	var resp models.LocationOperationsResponse
	err = s.withRetry("fetch_weekly_schedule", func() error {
		return session.fetchJSON(url, &resp, 25*time.Second)
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

// browserSession owns one live browser connection and recycles it before it
// outlives the remote provider's session cap. Callers navigate through
// fetchJSON and never hold on to the underlying context, because recycling
// replaces it.
type browserSession struct {
	scraper *BrowserAPIScraper
	parent  context.Context
	ctx     context.Context
	cancel  context.CancelFunc
	// open launches a replacement session. It is a field so recycling can be
	// exercised without a real browser.
	open func(context.Context) (context.Context, context.CancelFunc, error)
	// navigations counts navigations performed by the current underlying
	// session, including retry attempts (each retry is a real page load). It
	// resets on recycle; totalNavigations does not.
	navigations      int
	totalNavigations int
	max              int
	// recycles counts how many times the underlying session was replaced.
	recycles int
}

// newSession opens the first browser session for a run.
func (s *BrowserAPIScraper) newSession(parent context.Context) (*browserSession, error) {
	max := s.MaxNavigationsPerSession
	if max < 1 {
		max = DefaultMaxNavigationsPerSession
	}

	ctx, cancel, err := s.newBrowserSession(parent)
	if err != nil {
		return nil, err
	}

	return &browserSession{
		scraper: s,
		parent:  parent,
		ctx:     ctx,
		cancel:  cancel,
		open:    s.newBrowserSession,
		max:     max,
	}, nil
}

// fetchJSON navigates to url in a fresh tab and decodes the response body,
// recycling the underlying session first if it has reached its navigation cap.
func (bs *browserSession) fetchJSON(url string, target any, timeout time.Duration) error {
	if err := bs.ensureCapacity(); err != nil {
		return err
	}
	bs.navigations++
	bs.totalNavigations++

	return bs.scraper.fetchJSONWithNewTab(bs.ctx, url, target, timeout)
}

// ensureCapacity replaces the underlying session once it has used its full
// navigation budget. A run that stays under the cap never pays for a second
// browser launch.
func (bs *browserSession) ensureCapacity() error {
	if bs.navigations < bs.max {
		return nil
	}

	log.Printf("browser-api recycling browser session after %d navigations", bs.navigations)
	bs.cancel()

	ctx, cancel, err := bs.open(bs.parent)
	if err != nil {
		// Leave cancel as a no-op so close() stays safe after a failed recycle.
		bs.ctx, bs.cancel = nil, func() {}
		return err
	}

	bs.ctx, bs.cancel, bs.navigations = ctx, cancel, 0
	bs.recycles++
	return nil
}

func (bs *browserSession) close() {
	if bs.cancel != nil {
		bs.cancel()
	}
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
