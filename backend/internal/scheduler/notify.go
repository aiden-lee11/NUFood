package scheduler

import (
	"backend/internal/db"
	"backend/internal/push"
	"backend/internal/scrapejob"
	"context"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	// Embed the timezone database so LoadLocation(campusZone) works even on
	// minimal container images that ship no system tzdata.
	_ "time/tzdata"
)

// mealLeadMinutes is how far ahead of a meal's start the notification fires, so
// each configured time maps to the meal beginning this many minutes later.
const mealLeadMinutes = 30

const (
	// preNotifyRefreshTimeout bounds the refresh chained ahead of a send. The
	// push is only useful while it is still ahead of the meal, so a refresh that
	// cannot finish inside this is abandoned and the stored menu is used
	// instead. Five halls at two navigations each finish in well under a minute
	// on a healthy day; this leaves room for retries against a slow upstream.
	preNotifyRefreshTimeout = 6 * time.Minute
	// preNotifyRefreshRetries is deliberately lower than the scheduled
	// refresh's, because here every retry delays the send.
	preNotifyRefreshRetries = 2
)

// clockTime is an hour:minute wall-clock slot interpreted in campusZone.
type clockTime struct {
	hour   int
	minute int
}

// defaultNotifyTimes fire 30 minutes before Breakfast (7:00), Lunch (11:00),
// and Dinner (17:00) — the meal boundaries the iOS app hardcodes.
var defaultNotifyTimes = []clockTime{{6, 30}, {10, 30}, {16, 30}}

// StartDailyNotify launches the background meal-notification loop unless
// disabled via ENABLE_NOTIFY_CRON=false. Send times are NOTIFY_TIMES_CST
// (comma-separated "H:MM" 24h values in America/Chicago, default
// "6:30,10:30,16:30"). It mirrors StartDailyScrape: one goroutine that sleeps
// until the next scheduled time, re-reads the meal it is about to announce and
// pushes each user their upcoming favorites. Failures are logged, never fatal.
func StartDailyNotify() {
	if disabledByEnv("ENABLE_NOTIFY_CRON") {
		log.Println("meal notifications disabled via ENABLE_NOTIFY_CRON=false")
		return
	}

	loc, err := time.LoadLocation(campusZone)
	if err != nil {
		log.Printf("failed to load timezone %q (%v); notify cron disabled", campusZone, err)
		return
	}

	times := parseNotifyTimes("NOTIFY_TIMES_CST", defaultNotifyTimes)
	go func() {
		for {
			next := nextRunTimes(time.Now(), times, loc)
			wait := time.Until(next)
			log.Printf("next meal notification at %s (in %s)", next.Format("2006-01-02 15:04 MST"), wait.Truncate(time.Second))
			time.Sleep(wait)
			runNotifyOnce(loc)
		}
	}()
}

// runNotifyOnce performs a single notification pass, isolating panics so the
// scheduler loop (and the server) survive any failure inside the send path.
func runNotifyOnce(loc *time.Location) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("meal notifications panicked: %v", r)
		}
	}()

	notifyForTime(time.Now().In(loc))
}

// notifyForTime refreshes and then announces the meal that the given fire time
// maps to. The fire time is a parameter rather than read from the clock so the
// pass can be driven from a fixed moment.
func notifyForTime(now time.Time) {
	meal := mealForFireTime(now)
	if meal == "" {
		log.Printf("meal notifications: no meal window maps to fire time %s; skipping", now.Format("15:04"))
		return
	}

	date := now.Format("2006-01-02")
	log.Printf("meal notifications starting for %s on %s", meal, date)

	// Re-read the menu this send is about to announce instead of trusting a
	// refresh that ran earlier and may still have been mid-write.
	refreshBeforeNotify(date, meal)

	tokensByUser, err := db.GetAllDeviceTokens()
	if err != nil {
		log.Printf("meal notifications failed to load device tokens: %v", err)
		return
	}

	ctx := context.Background()
	var notified, skipped int
	var invalidTokens []string
	for userID, tokens := range tokensByUser {
		if len(tokens) == 0 {
			continue
		}

		favorites, err := db.GetAvailableFavoritesForMeal(userID, date, meal)
		if err != nil {
			log.Printf("meal notifications: error getting favorites for user %s: %v", userID, err)
			continue
		}

		title, body := push.BuildNotification(meal, favorites)
		if body == "" {
			skipped++
			continue
		}

		invalid, err := push.Send(ctx, tokens, title, body)
		if err != nil {
			log.Printf("meal notifications: error sending to user %s: %v", userID, err)
			continue
		}
		invalidTokens = append(invalidTokens, invalid...)
		notified++
	}

	if len(invalidTokens) > 0 {
		if err := db.DeleteDeviceTokensByToken(invalidTokens); err != nil {
			log.Printf("meal notifications: error pruning invalid tokens: %v", err)
		}
	}

	log.Printf("meal notifications complete for %s: %d users notified, %d skipped, %d tokens pruned",
		meal, notified, skipped, len(invalidTokens))
}

// refreshBeforeNotify re-scrapes the meal a send is about to announce so the
// push reflects what the halls are serving right now rather than whatever the
// last scheduled refresh left behind. It is a variable so tests can observe the
// ordering without touching the network.
//
// Every failure mode ends the same way: log it and let the send proceed against
// the stored menu. A stale notification is worth far more than a silent one,
// and the refresh itself can no longer empty a slice it did not verify as
// closed (see scrapejob.planPeriodRefresh).
var refreshBeforeNotify = func(date, meal string) {
	// Never queue behind another scrape — waiting for it would push the send
	// past the meal it is announcing. Whatever is running is refreshing the same
	// data anyway.
	if !scrapejob.TryLock() {
		log.Printf("pre-notify refresh for %s skipped: another scrape job is running", meal)
		return
	}
	defer scrapejob.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), preNotifyRefreshTimeout)
	defer cancel()

	summary, err := scrapejob.RunPeriodRefresh(ctx, scrapejob.PeriodRefreshOptions{
		Date:    date,
		Meal:    meal,
		Retries: preNotifyRefreshRetries,
	})
	if err != nil {
		log.Printf("pre-notify refresh for %s failed (using stored data): %v", meal, err)
		return
	}

	log.Printf("pre-notify refresh for %s: ok slices=%d items=%d unchanged=%d failed=%d preserved=%d",
		meal, summary.Slices, summary.Items, summary.Unchanged, summary.Failed, summary.Preserved)
}

// mealForFireTime derives the meal a notification announces from the wall-clock
// time it fired: the meal is whichever period contains fireTime + lead minutes.
// Windows are Breakfast 7–10, Lunch 11–16, Dinner 17–22. Returns "" when the
// lead time falls in no window.
func mealForFireTime(fireTime time.Time) string {
	return mealForFireMinutes(fireTime.Hour()*60 + fireTime.Minute())
}

// mealForFireMinutes is mealForFireTime over a minute-of-day, so a scheduled
// slot can be mapped to its meal without inventing a date. Times that would
// carry past midnight wrap, matching time.Add.
func mealForFireMinutes(minutes int) string {
	switch h := ((minutes + mealLeadMinutes) / 60) % 24; {
	case h >= 7 && h <= 10:
		return "Breakfast"
	case h >= 11 && h <= 16:
		return "Lunch"
	case h >= 17 && h <= 22:
		return "Dinner"
	default:
		return ""
	}
}

// nextRunTimes returns the soonest scheduled time strictly after now, picking
// the nearest hour:minute slot (interpreted in loc), rolling into tomorrow when
// all of today's slots have passed.
func nextRunTimes(now time.Time, times []clockTime, loc *time.Location) time.Time {
	nowLoc := now.In(loc)
	var best time.Time
	for _, dayOffset := range []int{0, 1} {
		day := nowLoc.AddDate(0, 0, dayOffset)
		for _, t := range times {
			cand := time.Date(day.Year(), day.Month(), day.Day(), t.hour, t.minute, 0, 0, loc)
			if cand.After(nowLoc) && (best.IsZero() || cand.Before(best)) {
				best = cand
			}
		}
	}
	return best
}

// parseNotifyTimes reads a comma-separated list of "H:MM" 24h times from the
// named env var into a de-duplicated slice, falling back to def when unset or
// fully invalid.
func parseNotifyTimes(envName string, def []clockTime) []clockTime {
	raw := strings.TrimSpace(os.Getenv(envName))
	if raw == "" {
		return def
	}

	seen := make(map[clockTime]bool)
	var times []clockTime
	for part := range strings.SplitSeq(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		t, ok := parseClockTime(part)
		if !ok {
			log.Printf("ignoring invalid %s entry %q", envName, part)
			continue
		}
		if !seen[t] {
			seen[t] = true
			times = append(times, t)
		}
	}

	if len(times) == 0 {
		log.Printf("%s=%q had no valid times; using default", envName, raw)
		return def
	}

	return times
}

// parseClockTime parses an "H:MM" 24h value into a clockTime.
func parseClockTime(value string) (clockTime, bool) {
	parts := strings.SplitN(value, ":", 2)
	if len(parts) != 2 {
		return clockTime{}, false
	}
	hour, err := strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil || hour < 0 || hour > 23 {
		return clockTime{}, false
	}
	minute, err := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil || minute < 0 || minute > 59 {
		return clockTime{}, false
	}
	return clockTime{hour: hour, minute: minute}, true
}
