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
