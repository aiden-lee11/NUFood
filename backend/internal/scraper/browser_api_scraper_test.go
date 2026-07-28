package scraper

import (
	"backend/internal/models"
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"
)

func TestDecodeBrowserJSON(t *testing.T) {
	var response struct {
		Periods []ServiceFixture `json:"periods"`
	}

	err := decodeBrowserJSON(
		"https://example.test/periods",
		`{"periods":[{"id":"breakfast"}]}`,
		&response,
	)
	if err != nil {
		t.Fatalf("decodeBrowserJSON returned an error: %v", err)
	}
	if len(response.Periods) != 1 || response.Periods[0].ID != "breakfast" {
		t.Fatalf("unexpected decoded response: %+v", response)
	}
}

func TestDecodeBrowserJSONClassifiesCloudflareBlock(t *testing.T) {
	var response any
	err := decodeBrowserJSON(
		"https://example.test/periods",
		"<html><title>Attention Required! | Cloudflare</title><body>Sorry, you have been blocked</body></html>",
		&response,
	)

	var fetchErr *BrowserFetchError
	if !errors.As(err, &fetchErr) {
		t.Fatalf("expected BrowserFetchError, got %T: %v", err, err)
	}
	if fetchErr.Class != ErrCloudflareChallenge {
		t.Fatalf("expected %q, got %q", ErrCloudflareChallenge, fetchErr.Class)
	}
}

func TestResolveBrowserWSURL(t *testing.T) {
	t.Setenv("BROWSER_WS_ENDPOINT", "wss://fallback.example.test")
	t.Setenv("BROWSERLESS_WS_URL", "wss://primary.example.test")

	if endpoint := resolveBrowserWSURL(); endpoint != "wss://primary.example.test" {
		t.Fatalf("unexpected browser endpoint: %q", endpoint)
	}
}

func TestBrowserAPIScraperLiveJSONAPIs(t *testing.T) {
	if os.Getenv("SCRAPER_LIVE_TEST") != "1" {
		t.Skip("set SCRAPER_LIVE_TEST=1 to run against the live dining API")
	}

	date := os.Getenv("SCRAPER_LIVE_DATE")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	s := NewBrowserAPIScraper()
	s.MaxRetries = 1

	browserCtx, cancelBrowser, err := s.newBrowserSession(context.Background())
	if err != nil {
		t.Fatalf("start browser session: %v", err)
	}
	defer cancelBrowser()

	url := s.BaseURL + "/locations/" + s.Locations[0].Hash + "/periods/?date=" + date
	var response periodsResponse
	if err := s.fetchJSONWithNewTab(browserCtx, url, &response, 30*time.Second); err != nil {
		t.Fatalf("fetch live periods API: %v", err)
	}
	if response.LocationID == "" {
		t.Fatal("live periods API returned an empty location ID")
	}
	if len(response.Periods) == 0 {
		t.Fatal("live periods API returned no periods")
	}

	menuURL := fmt.Sprintf(
		"%s/locations/%s/menu?date=%s&period=%s",
		s.BaseURL,
		s.Locations[0].Hash,
		date,
		response.Periods[0].ID,
	)
	var menu models.DiningHallResponse
	if err := s.fetchJSONWithNewTab(browserCtx, menuURL, &menu, 30*time.Second); err != nil {
		t.Fatalf("fetch live menu API: %v", err)
	}
	if menu.Date == "" {
		t.Fatal("live menu API returned an empty date")
	}

	scheduleURL := fmt.Sprintf(
		"%s/locations/weekly_schedule?site_id=%s&date=%s",
		s.BaseURL,
		s.SiteID,
		date,
	)
	var schedule models.LocationOperationsResponse
	if err := s.fetchJSONWithNewTab(browserCtx, scheduleURL, &schedule, 30*time.Second); err != nil {
		t.Fatalf("fetch live schedule API: %v", err)
	}
	if len(schedule.Locations) == 0 {
		t.Fatal("live schedule API returned no locations")
	}
}

func TestBrowserAPIScraperLiveScrapeFood(t *testing.T) {
	if os.Getenv("SCRAPER_LIVE_TEST") != "1" {
		t.Skip("set SCRAPER_LIVE_TEST=1 to run against the live dining API")
	}

	date := os.Getenv("SCRAPER_LIVE_DATE")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	s := NewBrowserAPIScraper()
	s.Locations = s.Locations[:1]
	s.MaxRetries = 1

	dailyItems, allDataItems, allClosed, err := s.ScrapeFood(date)
	if err != nil {
		t.Fatalf("scrape live menu: %v", err)
	}
	if allClosed {
		t.Fatal("live menu unexpectedly reported every location closed")
	}
	if len(dailyItems) == 0 || len(allDataItems) == 0 {
		t.Fatalf("live menu returned no items: daily=%d all=%d", len(dailyItems), len(allDataItems))
	}
}

type ServiceFixture struct {
	ID string `json:"id"`
}

func TestPickServiceForMeal(t *testing.T) {
	weekday := []models.Service{
		{ID: "b", TimeOfDay: "Breakfast"},
		{ID: "l", TimeOfDay: "Lunch"},
		{ID: "d", TimeOfDay: "Dinner"},
		{ID: "e", TimeOfDay: "Everyday"},
	}
	weekend := []models.Service{
		{ID: "br", TimeOfDay: "Brunch"},
		{ID: "d", TimeOfDay: "Dinner"},
	}

	cases := []struct {
		name     string
		services []models.Service
		meal     string
		wantID   string
		wantOK   bool
	}{
		{"exact match", weekday, "Lunch", "l", true},
		{"case insensitive", weekday, "dINNer", "d", true},
		{"brunch serves a lunch request", weekend, "Lunch", "br", true},
		{"brunch does not serve breakfast", weekend, "Breakfast", "", false},
		{"exact lunch wins over brunch", append([]models.Service{{ID: "br", TimeOfDay: "Brunch"}}, weekday...), "Lunch", "l", true},
		{"missing meal", weekend, "Breakfast", "", false},
		{"empty meal", weekday, "  ", "", false},
		{"no periods at all", nil, "Lunch", "", false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, ok := pickServiceForMeal(c.services, c.meal)
			if ok != c.wantOK {
				t.Fatalf("ok = %v, want %v", ok, c.wantOK)
			}
			if got.ID != c.wantID {
				t.Fatalf("id = %q, want %q", got.ID, c.wantID)
			}
		})
	}
}

// Only an explicit statement from upstream counts as a closure, because a
// closure is the one thing that lets a refresh delete a stored menu.
func TestMenuReportsClosed(t *testing.T) {
	cases := []struct {
		name string
		menu models.DiningHallResponse
		want bool
	}{
		{"closed for the whole date", models.DiningHallResponse{ClosedOnDate: true}, true},
		{"status says closed", models.DiningHallResponse{Status: models.MenuStatus{Label: "Closed"}}, true},
		{"status says closed with detail", models.DiningHallResponse{Status: models.MenuStatus{Label: "closed_today"}}, true},
		{
			"an open hall whose message mentions closing",
			models.DiningHallResponse{Status: models.MenuStatus{Label: "open", Message: "Open. Closes at 1:30pm."}},
			false,
		},
		{
			"a message alone never counts",
			models.DiningHallResponse{Status: models.MenuStatus{Message: "Closed. Opens at 5:00pm."}},
			false,
		},
		{"an empty menu says nothing either way", models.DiningHallResponse{Date: "2026-07-27"}, false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := menuReportsClosed(c.menu); got != c.want {
				t.Fatalf("menuReportsClosed = %v, want %v", got, c.want)
			}
		})
	}
}

// A run that stays under the navigation cap must never pay for a second browser
// launch; one that exceeds it must recycle exactly as often as needed.
func TestBrowserSessionRecycling(t *testing.T) {
	cases := []struct {
		name         string
		max          int
		navigations  int
		wantRecycles int
	}{
		{"under the cap uses one session", 12, 11, 0},
		{"exactly at the cap uses one session", 12, 12, 0},
		{"one past the cap recycles once", 12, 13, 1},
		{"long run recycles repeatedly", 5, 17, 3},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			opens := 0
			session := &browserSession{
				parent: context.Background(),
				ctx:    context.Background(),
				cancel: func() {},
				max:    c.max,
				open: func(ctx context.Context) (context.Context, context.CancelFunc, error) {
					opens++
					return context.Background(), func() {}, nil
				},
			}

			for range c.navigations {
				if err := session.ensureCapacity(); err != nil {
					t.Fatalf("ensureCapacity: %v", err)
				}
				session.navigations++
				session.totalNavigations++
			}

			if session.recycles != c.wantRecycles {
				t.Fatalf("recycles = %d, want %d", session.recycles, c.wantRecycles)
			}
			if opens != c.wantRecycles {
				t.Fatalf("browser launches after the first = %d, want %d", opens, c.wantRecycles)
			}
			if session.totalNavigations != c.navigations {
				t.Fatalf("totalNavigations = %d, want %d", session.totalNavigations, c.navigations)
			}
			if session.navigations > c.max {
				t.Fatalf("current session used %d navigations, over the cap of %d", session.navigations, c.max)
			}
		})
	}
}

// A failed recycle must surface the error and leave the session safe to close.
func TestBrowserSessionRecycleFailure(t *testing.T) {
	session := &browserSession{
		parent: context.Background(),
		ctx:    context.Background(),
		cancel: func() {},
		max:    1,
		open: func(ctx context.Context) (context.Context, context.CancelFunc, error) {
			return nil, nil, errors.New("browser gone")
		},
	}
	session.navigations = 1

	if err := session.ensureCapacity(); err == nil {
		t.Fatal("expected an error when the replacement session cannot start")
	}
	session.close() // must not panic
}
