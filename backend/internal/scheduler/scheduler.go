// Package scheduler runs the menu scrape inside the always-on backend process,
// replacing the old external Vercel cron. It is intentionally tiny: a single
// goroutine that sleeps until the next scheduled time and calls scrapejob.Run.
// Failures are logged, never fatal, so a bad scrape can't take the web server
// down.
package scheduler

import (
	"backend/internal/scrapejob"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	// Embed the timezone database so LoadLocation("America/Chicago") works even
	// on minimal container images that ship no system tzdata.
	_ "time/tzdata"
)

// scrapeZone anchors scheduling and the scrape window to the campus timezone, so
// "today" always means the Chicago day (and DST is handled automatically —
// fixed UTC hours would drift an hour between CST and CDT).
const scrapeZone = "America/Chicago"

// defaultHours: 6am catches the finalized menu for the day; 6pm catches the
// mid-day menu edits dining services sometimes make and pre-fetches tomorrow.
var defaultHours = []int{6, 18}

// StartDailyScrape launches the background scrape loop unless disabled via
// ENABLE_SCRAPE_CRON=false. Run times are SCRAPE_HOURS_CST (comma-separated
// hours 0-23 in America/Chicago, default "6,18").
func StartDailyScrape() {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("ENABLE_SCRAPE_CRON")), "false") {
		log.Println("daily scrape disabled via ENABLE_SCRAPE_CRON=false")
		return
	}

	loc, err := time.LoadLocation(scrapeZone)
	if err != nil {
		log.Printf("failed to load timezone %q (%v); scrape cron disabled", scrapeZone, err)
		return
	}

	hours := scrapeHours()
	go func() {
		for {
			next := nextRun(time.Now(), hours, loc)
			wait := time.Until(next)
			log.Printf("next menu scrape at %s (in %s)", next.Format("2006-01-02 15:04 MST"), wait.Truncate(time.Second))
			time.Sleep(wait)
			runOnce(loc)
		}
	}()
}

// runOnce performs a single scrape, isolating panics so the scheduler loop (and
// the server) survive any failure inside the scrape/persist path. The scrape
// window is centered on the current Chicago day.
func runOnce(loc *time.Location) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("menu scrape panicked: %v", r)
		}
	}()

	log.Println("menu scrape starting")
	if err := scrapejob.Run(scrapejob.DefaultOptions(time.Now().In(loc))); err != nil {
		log.Printf("menu scrape failed: %v", err)
		return
	}
	log.Println("menu scrape complete")
}

// nextRun returns the soonest scheduled time strictly after now, picking the
// nearest hour in hours (interpreted in loc), rolling into tomorrow if all of
// today's slots have passed.
func nextRun(now time.Time, hours []int, loc *time.Location) time.Time {
	nowLoc := now.In(loc)
	var best time.Time
	for _, dayOffset := range []int{0, 1} {
		day := nowLoc.AddDate(0, 0, dayOffset)
		for _, h := range hours {
			cand := time.Date(day.Year(), day.Month(), day.Day(), h, 0, 0, 0, loc)
			if cand.After(nowLoc) && (best.IsZero() || cand.Before(best)) {
				best = cand
			}
		}
	}
	return best
}

// scrapeHours parses SCRAPE_HOURS_CST into a sorted, de-duplicated hour list,
// falling back to defaultHours when unset or fully invalid.
func scrapeHours() []int {
	raw := strings.TrimSpace(os.Getenv("SCRAPE_HOURS_CST"))
	if raw == "" {
		return defaultHours
	}

	seen := make(map[int]bool)
	var hours []int
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		h, err := strconv.Atoi(part)
		if err != nil || h < 0 || h > 23 {
			log.Printf("ignoring invalid SCRAPE_HOURS_CST entry %q", part)
			continue
		}
		if !seen[h] {
			seen[h] = true
			hours = append(hours, h)
		}
	}

	if len(hours) == 0 {
		log.Printf("SCRAPE_HOURS_CST=%q had no valid hours; using default %v", raw, defaultHours)
		return defaultHours
	}

	sort.Ints(hours)
	return hours
}
