// Package scheduler runs the daily menu scrape inside the always-on backend
// process, replacing the old external Vercel cron. It is intentionally tiny:
// a single goroutine that sleeps until the next scheduled time and calls
// scrapejob.Run. Failures are logged, never fatal, so a bad scrape can't take
// the web server down.
package scheduler

import (
	"backend/internal/scrapejob"
	"log"
	"os"
	"strconv"
	"strings"
	"time"
)

// StartDailyScrape launches the background scrape loop unless disabled via
// ENABLE_SCRAPE_CRON=false. The run time is SCRAPE_HOUR_UTC (0-23, default 0 =
// midnight UTC), matching the old Vercel cron schedule "0 0 * * *".
func StartDailyScrape() {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("ENABLE_SCRAPE_CRON")), "false") {
		log.Println("daily scrape disabled via ENABLE_SCRAPE_CRON=false")
		return
	}

	hour := scrapeHourUTC()
	go func() {
		for {
			wait := durationUntilNextRun(time.Now().UTC(), hour)
			log.Printf("daily scrape scheduled in %s (next run at %02d:00 UTC)", wait.Truncate(time.Second), hour)
			time.Sleep(wait)
			runOnce()
		}
	}()
}

// runOnce performs a single scrape, isolating panics so the scheduler loop (and
// the server) survive any failure inside the scrape/persist path.
func runOnce() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("daily scrape panicked: %v", r)
		}
	}()

	log.Println("daily scrape starting")
	if err := scrapejob.Run(scrapejob.DefaultOptions(time.Now())); err != nil {
		log.Printf("daily scrape failed: %v", err)
		return
	}
	log.Println("daily scrape complete")
}

// durationUntilNextRun returns how long to wait until the next occurrence of
// hour:00 UTC strictly after now.
func durationUntilNextRun(now time.Time, hour int) time.Duration {
	next := time.Date(now.Year(), now.Month(), now.Day(), hour, 0, 0, 0, time.UTC)
	if !next.After(now) {
		next = next.AddDate(0, 0, 1)
	}
	return next.Sub(now)
}

func scrapeHourUTC() int {
	raw := strings.TrimSpace(os.Getenv("SCRAPE_HOUR_UTC"))
	if raw == "" {
		return 0
	}
	h, err := strconv.Atoi(raw)
	if err != nil || h < 0 || h > 23 {
		log.Printf("invalid SCRAPE_HOUR_UTC=%q; defaulting to 0", raw)
		return 0
	}
	return h
}
