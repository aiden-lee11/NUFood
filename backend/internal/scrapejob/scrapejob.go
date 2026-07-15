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
	"fmt"
	"log"
	"strings"
	"time"
)

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

// refreshMenuStore reloads the persisted menu (weekly items + the searchable
// all-items list) from the DB into the in-memory store that serves read
// requests. Reloading from the DB — rather than reusing this run's slices —
// picks up retained older dates the current scrape didn't touch. Store failures
// are logged, not fatal: the DB is authoritative and a later request or restart
// will recover. In the standalone CLI path the global store is nil and Set is a
// safe no-op.
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
