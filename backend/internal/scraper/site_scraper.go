package scraper

import (
	"backend/internal/models"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/chromedp/cdproto/browser"
	"github.com/chromedp/cdproto/runtime"
	"github.com/chromedp/chromedp"
)

// SiteScraper collects menus by loading the menu page in a local Chrome and
// issuing the menu requests from that page's context, the same calls the web
// app makes. It attaches to a Chrome started with --remote-debugging-port.
type SiteScraper struct {
	// BrowserWSURL is the DevTools browser websocket of a running Chrome (from
	// http://localhost:9222/json/version).
	BrowserWSURL string
	// MenuPageURL is loaded once per session to establish the page context the
	// menu requests run in.
	MenuPageURL string
	APIBase     string
	Locations   []models.Location
	SiteID      string
}

func NewSiteScraper(browserWSURL string) *SiteScraper {
	return &SiteScraper{
		BrowserWSURL: browserWSURL,
		MenuPageURL:  "https://dineoncampus.com/northwestern/whats-on-the-menu",
		APIBase:      DefaultConfig.BaseURL,
		Locations:    DefaultConfig.Locations,
		SiteID:       DefaultConfig.SiteID,
	}
}

// siteSession is one loaded page against which the menu requests run.
type siteSession struct {
	ctx    context.Context
	cancel context.CancelFunc
}

// newSession attaches to the running Chrome, opens a tab, loads the menu page,
// and waits for it to finish loading.
func (s *SiteScraper) newSession(parent context.Context) (*siteSession, error) {
	alloc, cancelAlloc := chromedp.NewRemoteAllocator(parent, s.BrowserWSURL)
	ctx, cancelCtx := chromedp.NewContext(alloc)
	cancel := func() { cancelCtx(); cancelAlloc() }

	// The first Run establishes the tab and must run on the session context
	// itself: bounding it with a child timeout would tear the tab down when the
	// child cancels. The parent context supplies the overall deadline.
	if err := chromedp.Run(ctx,
		chromedp.ActionFunc(minimizeWindow),
		chromedp.Navigate(s.MenuPageURL),
		chromedp.WaitReady("body", chromedp.ByQuery),
		chromedp.Sleep(12*time.Second),
	); err != nil {
		cancel()
		return nil, fmt.Errorf("load menu page: %w", err)
	}

	var pageText string
	_ = chromedp.Run(ctx, chromedp.Text("body", &pageText, chromedp.ByQuery))
	if l := strings.ToLower(pageText); strings.Contains(l, "security verification") || strings.Contains(l, "just a moment") {
		cancel()
		return nil, fmt.Errorf("menu page did not finish loading")
	}
	return &siteSession{ctx: ctx, cancel: cancel}, nil
}

func (ss *siteSession) close() { ss.cancel() }

// minimizeWindow keeps the browser window off-screen while it works. Best
// effort: any failure (e.g. an environment with no window) is ignored.
func minimizeWindow(ctx context.Context) error {
	c := chromedp.FromContext(ctx)
	if c == nil || c.Target == nil {
		return nil
	}
	winID, _, err := browser.GetWindowForTarget().WithTargetID(c.Target.TargetID).Do(ctx)
	if err != nil {
		return nil
	}
	_ = browser.SetWindowBounds(winID, &browser.Bounds{WindowState: browser.WindowStateMinimized}).Do(ctx)
	return nil
}

// fetchJSON runs `fetch(url)` from inside the loaded page and decodes the
// response. Credentials are omitted because adding them trips a CORS preflight
// the API rejects.
func (ss *siteSession) fetchJSON(url string, target any, timeout time.Duration) error {
	call, cancel := context.WithTimeout(ss.ctx, timeout)
	defer cancel()

	// The fetch resolves to {ok, status, body}; a network/CORS failure resolves
	// to {ok:false, error} rather than rejecting, so we can report it cleanly.
	js := `fetch(` + jsString(url) + `).then(async r => JSON.stringify({ok:r.ok, status:r.status, body: await r.text()})).catch(e => JSON.stringify({ok:false, status:0, error:String(e)}))`

	var raw string
	if err := chromedp.Run(call, chromedp.Evaluate(js, &raw, func(p *runtime.EvaluateParams) *runtime.EvaluateParams {
		return p.WithAwaitPromise(true).WithReturnByValue(true)
	})); err != nil {
		return fmt.Errorf("in-page fetch %s: %w", url, err)
	}

	var env struct {
		OK     bool   `json:"ok"`
		Status int    `json:"status"`
		Body   string `json:"body"`
		Error  string `json:"error"`
	}
	if err := json.Unmarshal([]byte(raw), &env); err != nil {
		return fmt.Errorf("decode fetch envelope for %s: %w", url, err)
	}
	if !env.OK {
		if env.Error != "" {
			return fmt.Errorf("fetch %s failed: %s", url, env.Error)
		}
		return fmt.Errorf("fetch %s returned HTTP %d", url, env.Status)
	}
	if err := json.Unmarshal([]byte(env.Body), target); err != nil {
		return fmt.Errorf("decode body of %s: %w", url, err)
	}
	return nil
}

// jsString safely encodes a Go string as a JS string literal.
func jsString(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}

// MealResult is one hall's outcome for a single meal on a given date.
type MealResult struct {
	Date string
	// Location is the dining hall name.
	Location string
	// Matched is true when the hall advertised a period for the requested meal.
	Matched bool
	// MatchedPeriod is the upstream period name that satisfied the request, which
	// can differ from it ("Brunch" for a "Lunch" request). Empty when unmatched.
	MatchedPeriod string
	DailyItems    []models.DailyItem
	AllItems      []models.AllDataItem
	Err           error
}

// ScrapeSession fetches one meal across the given dates and every hall from a
// single loaded page. Within each date the halls are visited in a shuffled
// order, and `pause` is invoked before every request except the first so the
// caller can space out requests. rng seeds the shuffle; pass a per-run source
// so the order varies.
func (s *SiteScraper) ScrapeSession(ctx context.Context, dates []string, meal string, rng *rand.Rand, pause func()) ([]MealResult, error) {
	session, err := s.newSession(ctx)
	if err != nil {
		return nil, err
	}
	defer session.close()

	var results []MealResult
	first := true
	for _, date := range dates {
		order := rng.Perm(len(s.Locations))
		for _, idx := range order {
			if !first && pause != nil {
				pause()
			}
			first = false
			r := s.scrapeHallMeal(session, s.Locations[idx], date, meal)
			r.Date = date
			results = append(results, r)
		}
	}
	return results, nil
}

func (s *SiteScraper) scrapeHallMeal(session *siteSession, loc models.Location, date, meal string) MealResult {
	res := MealResult{Location: loc.Name}

	periodsURL := fmt.Sprintf("%s/locations/%s/periods/?date=%s", s.APIBase, loc.Hash, date)
	var pr periodsResponse
	if err := session.fetchJSON(periodsURL, &pr, 20*time.Second); err != nil {
		res.Err = fmt.Errorf("%s periods: %w", loc.Name, err)
		return res
	}
	service, ok := pickServiceForMeal(pr.Periods, meal)
	if !ok {
		return res // hall not serving this meal; not an error
	}
	res.Matched = true
	res.MatchedPeriod = strings.TrimSpace(service.TimeOfDay)

	menuURL := fmt.Sprintf("%s/locations/%s/menu?date=%s&period=%s", s.APIBase, loc.Hash, date, service.ID)
	var wrapped periodMenuResponse
	if err := session.fetchJSON(menuURL, &wrapped, 25*time.Second); err != nil {
		res.Err = fmt.Errorf("%s %s menu: %w", loc.Name, service.TimeOfDay, err)
		return res
	}
	daily, all, err := parseItems(wrapped.resolve(), loc.Name, service.TimeOfDay)
	if err != nil {
		res.Err = fmt.Errorf("%s %s parse: %w", loc.Name, service.TimeOfDay, err)
		return res
	}
	res.DailyItems = daily
	res.AllItems = all
	return res
}
