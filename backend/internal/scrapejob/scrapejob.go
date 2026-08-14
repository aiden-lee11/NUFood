// Package scrapejob holds the shared "scrape the menu + hours and persist" routine.
//
// It is called from two places:
//   - cmd/local_scrape: a standalone CLI job (also runnable as a Railway cron service)
//   - the always-on backend server's in-process daily scheduler (see internal/scheduler)
//
// It assumes the db package has already been initialized by the caller.
package scrapejob

import (
	"backend/internal/db"
	"backend/internal/models"
	"backend/internal/scraper"
	"backend/internal/store"
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"
)

// jobMu serializes every scrape that talks to the upstream site: the scheduled
// full scrape, the scheduled period refreshes, and the manual HTTP scrape
// handlers. Only one browser session may be paid for at a time, and two
// concurrent runs would race on the same rows. Callers use TryLock and skip
// (never queue) when it is held.
var jobMu sync.Mutex

// TryLock attempts to claim the global scrape lock, returning false when
// another scrape is already running.
func TryLock() bool { return jobMu.TryLock() }

// Unlock releases the lock claimed by TryLock.
func Unlock() { jobMu.Unlock() }

// freshness remembers the upstream updatedAt stamp of every menu currently
// persisted, so a period refresh can recognize an untouched menu and skip
// parsing and writing it. It lives for the process lifetime; losing it on
// restart only costs one redundant write.
var freshness = struct {
	mu   sync.Mutex
	seen map[scraper.MenuKey]string
}{seen: make(map[scraper.MenuKey]string)}

// menuUnchanged reports whether a fetched menu carries the same upstream edit
// stamp as the copy already persisted. A missing stamp is never treated as
// unchanged: without it there is no evidence, so the menu is reparsed.
func menuUnchanged(key scraper.MenuKey, updatedAt string) bool {
	if strings.TrimSpace(updatedAt) == "" {
		return false
	}

	freshness.mu.Lock()
	defer freshness.mu.Unlock()

	previous, ok := freshness.seen[key]
	return ok && previous == updatedAt
}

// rememberMenus records stamps for menus that were just persisted. Empty stamps
// are dropped so they can never match a later empty stamp.
func rememberMenus(stamps map[scraper.MenuKey]string) {
	freshness.mu.Lock()
	defer freshness.mu.Unlock()

	for key, updatedAt := range stamps {
		if strings.TrimSpace(updatedAt) == "" {
			continue
		}
		freshness.seen[key] = updatedAt
	}
}

// replaceMenus discards the whole tracker and repopulates it from a full
// scrape, dropping stamps for dates that have rolled out of the window.
func replaceMenus(stamps map[scraper.MenuKey]string) {
	freshness.mu.Lock()
	freshness.seen = make(map[scraper.MenuKey]string, len(stamps))
	freshness.mu.Unlock()

	rememberMenus(stamps)
}

// ResetFreshness forgets every recorded menu stamp, forcing the next refresh to
// reparse and rewrite. Exported for tests and for operational recovery.
func ResetFreshness() {
	freshness.mu.Lock()
	defer freshness.mu.Unlock()
	freshness.seen = make(map[scraper.MenuKey]string)
}

// Options controls a single scrape run.
type Options struct {
	BaseDate    time.Time // first date of the scrape window
	DaysForward int       // scrape BaseDate through BaseDate + DaysForward
	Retries     int       // attempts per scrape call
	ScrapeHours bool      // also refresh location operating hours
}

// DefaultOptions mirrors the cmd/local_scrape flag defaults.
func DefaultOptions(baseDate time.Time) Options {
	return Options{
		BaseDate:    baseDate,
		DaysForward: 5,
		Retries:     3,
		ScrapeHours: true,
	}
}

// Run scrapes the menu window (and optionally operating hours) and persists the
// result. It returns an error instead of exiting, so the caller decides how to
// react (the CLI logs and exits non-zero; the server logs and keeps serving).
//
// The database is left unchanged if any date in the window fails to scrape.
func Run(opts Options) error {
	retries := opts.Retries
	if retries < 1 {
		retries = 1
	}

	// MenuUnchanged is deliberately left nil: the daily full scrape bypasses the
	// freshness short-circuit and reparses everything, then repopulates the
	// tracker below so refreshes have a trustworthy baseline.
	s := scraper.NewBrowserAPIScraper()
	s.MaxRetries = retries

	var weeklyItems []models.WeeklyItem
	var totalAllItems []models.AllDataItem
	var scrapedDates []string
	var failedDates []string

	for dayIndex := 0; dayIndex <= opts.DaysForward; dayIndex++ {
		scrapeDate := opts.BaseDate.AddDate(0, 0, dayIndex).Format("2006-01-02")
		log.Printf("scraping menu for date=%s dayIndex=%d", scrapeDate, dayIndex)

		var dItems []models.DailyItem
		var aItems []models.AllDataItem
		var scrapeErr error

		for attempt := 1; attempt <= retries; attempt++ {
			dItems, aItems, _, scrapeErr = s.ScrapeFood(scrapeDate)
			if scrapeErr == nil {
				break
			}
			log.Printf("scrape failed date=%s attempt=%d/%d err=%v", scrapeDate, attempt, retries, scrapeErr)
		}

		if scrapeErr != nil {
			log.Printf("skipping date=%s after retries; err=%v", scrapeDate, scrapeErr)
			failedDates = append(failedDates, scrapeDate)
			continue
		}
		scrapedDates = append(scrapedDates, scrapeDate)

		if len(dItems) == 0 {
			log.Printf("no menu items for date=%s", scrapeDate)
			continue
		}

		for _, dItem := range dItems {
			weeklyItems = append(weeklyItems, models.WeeklyItem{
				DailyItem: dItem,
			})
		}
		totalAllItems = append(totalAllItems, aItems...)

		log.Printf("date=%s daily_items=%d all_items=%d", scrapeDate, len(dItems), len(aItems))
	}

	if len(failedDates) > 0 {
		return fmt.Errorf("scrape incomplete for dates %s; database left unchanged", strings.Join(failedDates, ", "))
	}
	if err := db.PersistScrapedMenu(weeklyItems, totalAllItems, scrapedDates, opts.BaseDate); err != nil {
		return fmt.Errorf("failed to persist scraped menu: %w", err)
	}

	// The database now matches exactly what this scrape saw, so the freshness
	// tracker is rebuilt from it (rather than merged) to drop stamps for dates
	// that have aged out of the window.
	replaceMenus(s.LastSeenUpdatedAt)

	// Refresh the in-memory store that serves read requests. Without this the
	// scheduler updates only the DB while the store keeps serving the snapshot it
	// lazily cached on the first request after deploy — so newly scraped future
	// days never reach clients until a restart. The HTTP scrape handlers already
	// do this; the scheduler must too. Non-fatal: the DB is the source of truth.
	refreshMenuStore()

	log.Printf("menu update complete weekly_items=%d all_items=%d", len(weeklyItems), len(totalAllItems))

	if !opts.ScrapeHours {
		return nil
	}

	// Use BaseDate's own location so "tomorrow" is the next campus day, not the
	// next UTC day (which can differ during the evening in Chicago).
	hoursDate := opts.BaseDate.AddDate(0, 0, 1).Format("2006-01-02")
	log.Printf("scraping operating hours date=%s", hoursDate)

	var hours []models.LocationOperatingTimes
	var hoursErr error

	for attempt := 1; attempt <= retries; attempt++ {
		hours, hoursErr = s.ScrapeLocationOperatingTimes(hoursDate)
		if hoursErr == nil {
			break
		}
		log.Printf("hours scrape failed attempt=%d/%d err=%v", attempt, retries, hoursErr)
	}

	if hoursErr != nil {
		return fmt.Errorf("failed to scrape operating hours: %w", hoursErr)
	}
	if len(hours) == 0 {
		return fmt.Errorf("hours scrape returned zero locations")
	}

	if err := db.ReplaceLocationOperatingTimes(hours); err != nil {
		return fmt.Errorf("failed to replace location operating times: %w", err)
	}
	// Keep the read store in sync with the freshly persisted hours (see above).
	store.Set(hours)

	log.Printf("hours update complete locations=%d", len(hours))
	return nil
}

// PeriodRefreshOptions controls a single period refresh.
type PeriodRefreshOptions struct {
	Date    string // YYYY-MM-DD, the campus day to refresh
	Meal    string // meal period to refresh, e.g. "Lunch"
	Retries int    // attempts per upstream fetch
}

// PeriodRefreshResult summarizes what a period refresh did, so a caller can log
// the outcome without re-deriving it from the results.
type PeriodRefreshResult struct {
	Slices    int // menu slices replaced
	Items     int // rows written into those slices
	Unchanged int // halls upstream had not edited
	Failed    int // halls whose fetch failed
	Preserved int // halls that fetched empty without verifying a closure
}

// periodRefreshPlan is the decision made from one period scrape's per-hall
// results: which slices may be replaced, what goes in them, and which halls
// were deliberately left alone.
type periodRefreshPlan struct {
	periods     []db.MenuPeriod
	weeklyItems []models.WeeklyItem
	allItems    []models.AllDataItem
	failed      []string
	preserved   []string
	unchanged   int
}

// planPeriodRefresh turns per-hall scrape results into the set of slices that
// may be rewritten. It is the whole data-safety policy, kept separate from the
// scrape and the write so it can be exercised directly.
//
// Rules, in order of importance:
//   - A hall whose fetch failed is omitted entirely, so its stored menu
//     survives untouched. A blip can never delete a good menu.
//   - A hall that fetched but produced no items is omitted too, UNLESS upstream
//     verified the closure. Zero items is the shape of an unpublished menu as
//     much as a closed hall, and wrongly clearing the slice empties the menu
//     minutes before the push that reads it.
//   - A hall upstream has not edited since it was last persisted is skipped
//     without parsing or writing.
func planPeriodRefresh(date, meal string, results []scraper.PeriodScrapeResult) periodRefreshPlan {
	var plan periodRefreshPlan

	for _, result := range results {
		if !result.Fetched {
			plan.failed = append(plan.failed, result.Location)
			continue
		}
		if result.Unchanged {
			plan.unchanged++
			continue
		}
		if len(result.DailyItems) == 0 && !result.ClosedVerified {
			plan.preserved = append(plan.preserved, result.Location)
			continue
		}

		// Clear the slice under the requested meal name and, when the hall
		// serves it under an alias ("Brunch" for lunch), that name too — they
		// are the same meal slot and only one of them may hold rows.
		plan.periods = append(plan.periods, db.MenuPeriod{Date: date, Location: result.Location, TimeOfDay: meal})
		if result.MatchedPeriod != "" && !strings.EqualFold(result.MatchedPeriod, meal) {
			plan.periods = append(plan.periods, db.MenuPeriod{Date: date, Location: result.Location, TimeOfDay: result.MatchedPeriod})
		}

		for _, item := range result.DailyItems {
			plan.weeklyItems = append(plan.weeklyItems, models.WeeklyItem{DailyItem: item})
		}
		plan.allItems = append(plan.allItems, result.AllItems...)
	}

	return plan
}

// RunPeriodRefresh re-scrapes one meal period on one date across every dining
// hall and replaces just those menu slices. It costs two navigations per open
// hall (period list + that period's menu) and one per hall that is not serving
// the meal, versus the ~18 the full-day scrape needs. See planPeriodRefresh for
// the rules governing which slices may be rewritten.
//
// ctx bounds the upstream work; cancelling it stops the scrape and the caller
// keeps whatever was already stored.
//
// It returns an error only when nothing at all could be refreshed; partial
// failures are logged and the healthy halls are still written.
func RunPeriodRefresh(ctx context.Context, opts PeriodRefreshOptions) (PeriodRefreshResult, error) {
	var summary PeriodRefreshResult

	if _, err := time.Parse("2006-01-02", opts.Date); err != nil {
		return summary, fmt.Errorf("invalid refresh date %q: %w", opts.Date, err)
	}
	meal := normalizeMeal(opts.Meal)
	if meal == "" {
		return summary, fmt.Errorf("refresh requires a meal period")
	}

	retries := opts.Retries
	if retries < 1 {
		retries = 1
	}

	s := scraper.NewBrowserAPIScraper()
	s.MaxRetries = retries
	s.MenuUnchanged = menuUnchanged

	results, err := s.ScrapePeriod(ctx, opts.Date, meal)
	if err != nil {
		return summary, fmt.Errorf("period refresh date=%s meal=%s could not start: %w", opts.Date, meal, err)
	}

	plan := planPeriodRefresh(opts.Date, meal, results)
	summary = PeriodRefreshResult{
		Slices:    len(plan.periods),
		Items:     len(plan.weeklyItems),
		Unchanged: plan.unchanged,
		Failed:    len(plan.failed),
		Preserved: len(plan.preserved),
	}

	if len(plan.failed) > 0 {
		log.Printf("period refresh date=%s meal=%s could not fetch %s; their stored menus are left unchanged",
			opts.Date, meal, strings.Join(plan.failed, ", "))
	}
	if len(plan.preserved) > 0 {
		log.Printf("warning: period refresh date=%s meal=%s got no items and no verified closure for %s; their stored menus are left unchanged",
			opts.Date, meal, strings.Join(plan.preserved, ", "))
	}

	if len(plan.periods) == 0 {
		if len(plan.failed) == len(results) && len(results) > 0 {
			return summary, fmt.Errorf("period refresh date=%s meal=%s failed for every location", opts.Date, meal)
		}
		log.Printf("period refresh date=%s meal=%s: nothing to write (unchanged=%d preserved=%d)",
			opts.Date, meal, plan.unchanged, len(plan.preserved))
		return summary, nil
	}

	if err := db.ReplaceMenuPeriods(plan.periods, plan.weeklyItems, plan.allItems); err != nil {
		return summary, fmt.Errorf("failed to persist period refresh date=%s meal=%s: %w", opts.Date, meal, err)
	}

	// Any write must be mirrored into the in-memory store or reads keep serving
	// the stale snapshot the store cached earlier.
	refreshMenuStore()
	rememberMenus(s.LastSeenUpdatedAt)

	log.Printf("period refresh complete date=%s meal=%s slices=%d items=%d unchanged=%d failed=%d preserved=%d",
		opts.Date, meal, summary.Slices, summary.Items, summary.Unchanged, summary.Failed, summary.Preserved)
	return summary, nil
}

// normalizeMeal trims a meal name and gives it the upstream's capitalization so
// the slice it clears matches the rows the full scrape stored.
func normalizeMeal(meal string) string {
	trimmed := strings.TrimSpace(meal)
	if trimmed == "" {
		return ""
	}
	lower := strings.ToLower(trimmed)
	return strings.ToUpper(lower[:1]) + lower[1:]
}

// refreshMenuStore reloads the persisted menu (weekly items + the searchable
// all-items list) from the DB into the in-memory store that serves read
// requests. Reloading from the DB — rather than reusing this run's slices —
// picks up retained older dates the current scrape didn't touch. Store failures
// are logged, not fatal: the DB is authoritative and a later request or restart
// will recover. In the standalone CLI path the global store is nil and Set is a
// safe no-op.
// RefreshMenuStore reloads the in-memory menu store from the database. It is
// the hook an external scraper (the home Mac) calls, via the reload endpoint,
// after it has written fresh menus straight to the DB — otherwise the backend
// keeps serving its lazily-loaded copy and clients go stale.
func RefreshMenuStore() { refreshMenuStore() }

func refreshMenuStore() {
	weekly, err := db.GetAllWeeklyItems()
	if err != nil {
		log.Printf("warning: refresh weekly-items store failed: %v", err)
	} else {
		store.Set(weekly)
	}

	allData, err := db.GetAllDataItems()
	if err != nil {
		log.Printf("warning: refresh all-items store failed: %v", err)
	} else {
		store.Set(allData)
	}
}
