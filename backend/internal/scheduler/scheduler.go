// Package scheduler runs the menu scrape inside the always-on backend process,
// replacing the old external Vercel cron. It owns two jobs on one goroutine:
//
//   - a full scrape once a day, early each morning, that rebuilds the whole
//     forward window (every date, hall and meal period) plus operating hours;
//   - lightweight period refreshes during service, which re-read only the meal
//     being served today and only for the halls that are open.
//
// The split exists because a full scrape costs ~90 upstream page loads while a
// refresh costs at most ten, and menus change during the day only for the meal
// currently on the line. Failures are logged, never fatal, so a bad scrape
// cannot take the web server down.
package scheduler

import (
	"backend/internal/db"
	"backend/internal/models"
	"backend/internal/scrapejob"
	"backend/internal/scraper"
	"backend/internal/store"
	"fmt"
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

// campusZone anchors scheduling (scrape and mailing) to the campus timezone, so
// "today" always means the Chicago day (and DST is handled automatically —
// fixed UTC hours would drift an hour between CST and CDT).
const campusZone = "America/Chicago"

// defaultFullScrapeTimes: 06:00 is after upstream has published the day's final
// menus and still ahead of the first refresh of the day (a 7:00 open is preceded
// by a 06:45 tick), so the day starts from a complete snapshot and the
// in-service refreshes only have to chase edits.
var defaultFullScrapeTimes = []clockTime{{6, 0}}

const (
	// maxRefreshRunsPerDay bounds what the refresh loop can spend upstream. Each
	// run is a handful of page loads. School-year operating hours derive plans
	// that land near twelve ticks, so the cap is set a little above that:
	// fourteen keeps the even-thinning in capRefreshTicks from engaging on a
	// normal day (which would cost resolution for no reason) while still
	// bounding runaway spend if hours are unusually long or malformed.
	maxRefreshRunsPerDay = 14
	// refreshLeadMinutes places the first refresh of a service block slightly
	// before doors open, so the menu is current the moment anyone looks.
	refreshLeadMinutes = 15
	// refreshIntervalMinutes is how often a hall is re-read while it is open.
	refreshIntervalMinutes = 60
	// refreshCoalesceMinutes merges near-simultaneous ticks contributed by
	// different halls into a single run, since one run refreshes every hall.
	refreshCoalesceMinutes = 15
)

// fallbackRefreshTicks is the fixed plan used when no operating hours are
// stored yet (first boot, or an hours scrape that has never succeeded). It
// approximates a normal three-block dining day.
var fallbackRefreshTicks = []clockTime{
	{7, 15}, {8, 15}, {9, 15},
	{10, 45}, {11, 45}, {12, 45},
	{16, 15}, {17, 15}, {18, 15},
}

// Meal boundaries used when a tick cannot say which meal it belongs to. They
// match the windows the clients assume.
const (
	breakfastEndMinutes = 10*60 + 30
	lunchEndMinutes     = 15*60 + 30
)

// refreshTick is one planned refresh: when to run, and which meal to re-read.
type refreshTick struct {
	at clockTime
	// meal is the period to refresh. Empty means "decide from the wall clock
	// when the tick fires".
	meal string
}

// minutes returns the slot as minutes since midnight.
func (c clockTime) minutes() int { return c.hour*60 + c.minute }

// on resolves the slot to an absolute time on day's calendar date in loc.
func (c clockTime) on(day time.Time, loc *time.Location) time.Time {
	day = day.In(loc)
	return time.Date(day.Year(), day.Month(), day.Day(), c.hour, c.minute, 0, 0, loc)
}

func (c clockTime) String() string {
	return fmt.Sprintf("%02d:%02d", c.hour, c.minute)
}

func minutesToClock(minutes int) clockTime {
	return clockTime{hour: minutes / 60, minute: minutes % 60}
}

// menuScheduler holds the day's plan. It is owned by a single goroutine — the
// loop below — and must not be shared.
type menuScheduler struct {
	loc            *time.Location
	fullTimes      []clockTime
	refreshEnabled bool
	// overrideTicks, when non-empty, replaces the derived plan entirely
	// (REFRESH_TICKS_CST).
	overrideTicks []refreshTick

	ticks    []refreshTick
	ticksDay string

	// runDay/runCount enforce the daily refresh budget even if an operator
	// configures more ticks than the cap allows.
	runDay   string
	runCount int
}

// StartDailyScrape launches the background menu loop. The full scrape is
// disabled by ENABLE_SCRAPE_CRON=false and the in-service refreshes by
// ENABLE_REFRESH_CRON=false; either may run without the other.
//
// Times are configurable in America/Chicago: SCRAPE_HOURS_CST (comma-separated
// hours 0-23, default 06:00) for the full scrape and REFRESH_TICKS_CST
// (comma-separated "H:MM" or "H:MM=Meal") for refreshes, which otherwise follow
// the halls' stored operating hours.
func StartDailyScrape() {
	fullEnabled := !disabledByEnv("ENABLE_SCRAPE_CRON")
	refreshEnabled := !disabledByEnv("ENABLE_REFRESH_CRON")

	if !fullEnabled {
		log.Println("daily scrape disabled via ENABLE_SCRAPE_CRON=false")
	}
	if !refreshEnabled {
		log.Println("menu refreshes disabled via ENABLE_REFRESH_CRON=false")
	}
	if !fullEnabled && !refreshEnabled {
		return
	}

	loc, err := time.LoadLocation(campusZone)
	if err != nil {
		log.Printf("failed to load timezone %q (%v); scrape cron disabled", campusZone, err)
		return
	}

	s := &menuScheduler{loc: loc, refreshEnabled: refreshEnabled}
	if fullEnabled {
		s.fullTimes = fullScrapeTimes()
		log.Printf("full menu scrape scheduled daily at %s", describeClockTimes(s.fullTimes))
	}
	if refreshEnabled {
		s.overrideTicks = parseRefreshTicks("REFRESH_TICKS_CST")
	}

	go s.loop()
}

// loop waits for the next scheduled job and runs it, rebuilding the refresh
// plan at the start of each campus day and again after every full scrape.
func (s *menuScheduler) loop() {
	for {
		now := time.Now().In(s.loc)
		s.ensureTicks(now)

		next, tick, ok := s.nextEvent(now)
		if !ok {
			// Nothing left today. Wake just after midnight so the new day's plan
			// is built from that day's operating hours.
			tomorrow := now.AddDate(0, 0, 1)
			wake := time.Date(tomorrow.Year(), tomorrow.Month(), tomorrow.Day(), 0, 5, 0, 0, s.loc)
			log.Printf("no menu jobs left today; sleeping until %s", wake.Format("2006-01-02 15:04 MST"))
			time.Sleep(time.Until(wake))
			continue
		}

		wait := time.Until(next)
		if tick == nil {
			log.Printf("next full menu scrape at %s (in %s)", next.Format("2006-01-02 15:04 MST"), wait.Truncate(time.Second))
		} else {
			log.Printf("next menu refresh (%s) at %s (in %s)", tick.mealOrClock(next), next.Format("2006-01-02 15:04 MST"), wait.Truncate(time.Second))
		}
		time.Sleep(wait)

		if tick == nil {
			runOnce(s.loc)
			// The full scrape refreshes operating hours, so the rest of today's
			// plan is rebuilt from the data it just wrote.
			s.ticksDay = ""
			continue
		}
		s.runRefresh(*tick)
	}
}

// nextEvent returns the soonest job strictly after now, today only. A nil tick
// means the full scrape. ok is false once the day has no jobs left.
func (s *menuScheduler) nextEvent(now time.Time) (time.Time, *refreshTick, bool) {
	var best time.Time
	var bestTick *refreshTick

	for _, t := range s.fullTimes {
		cand := t.on(now, s.loc)
		if cand.After(now) && (best.IsZero() || cand.Before(best)) {
			best, bestTick = cand, nil
		}
	}

	if s.refreshEnabled {
		for i := range s.ticks {
			cand := s.ticks[i].at.on(now, s.loc)
			if cand.After(now) && (best.IsZero() || cand.Before(best)) {
				best, bestTick = cand, &s.ticks[i]
			}
		}
	}

	return best, bestTick, !best.IsZero()
}

// ensureTicks (re)builds the refresh plan for the campus day containing now.
func (s *menuScheduler) ensureTicks(now time.Time) {
	if !s.refreshEnabled {
		return
	}

	day := now.Format("2006-01-02")
	if s.ticksDay == day {
		return
	}
	s.ticksDay = day

	if len(s.overrideTicks) > 0 {
		s.ticks = capRefreshTicks(s.overrideTicks, maxRefreshRunsPerDay)
		log.Printf("menu refresh plan for %s (REFRESH_TICKS_CST): %s", day, describeTicks(s.ticks))
		return
	}

	ticks := deriveRefreshTicks(storedOperatingHours(), day)
	if len(ticks) == 0 {
		ticks = fixedRefreshTicks()
		log.Printf("no stored operating hours for %s; falling back to fixed refresh ticks", day)
	}

	s.ticks = capRefreshTicks(ticks, maxRefreshRunsPerDay)
	log.Printf("menu refresh plan for %s: %s", day, describeTicks(s.ticks))
}

// runRefresh performs one period refresh, isolating panics so the loop survives
// any failure inside the scrape/persist path.
func (s *menuScheduler) runRefresh(tick refreshTick) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("menu refresh panicked: %v", r)
		}
	}()

	now := time.Now().In(s.loc)
	day := now.Format("2006-01-02")
	if s.runDay != day {
		s.runDay, s.runCount = day, 0
	}
	if s.runCount >= maxRefreshRunsPerDay {
		log.Printf("menu refresh budget for %s already spent (%d runs); skipping %s", day, s.runCount, tick.at)
		return
	}

	meal := tick.mealOrClock(now)

	// Never queue behind another scrape: by the time it finished, this tick's
	// moment has passed and the next tick will cover the same ground.
	if !scrapejob.TryLock() {
		log.Printf("menu refresh (%s at %s) skipped: another scrape job is running", meal, tick.at)
		return
	}
	defer scrapejob.Unlock()

	s.runCount++
	log.Printf("menu refresh starting date=%s meal=%s (run %d/%d today)", day, meal, s.runCount, maxRefreshRunsPerDay)
	if err := scrapejob.RunPeriodRefresh(scrapejob.PeriodRefreshOptions{
		Date:    day,
		Meal:    meal,
		Retries: 3,
	}); err != nil {
		log.Printf("menu refresh failed: %v", err)
		return
	}
	log.Println("menu refresh complete")
}

// runOnce performs a single full scrape, isolating panics so the scheduler loop
// (and the server) survive any failure inside the scrape/persist path. The
// scrape window runs forward from the current Chicago day.
func runOnce(loc *time.Location) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("menu scrape panicked: %v", r)
		}
	}()

	if !scrapejob.TryLock() {
		log.Println("full menu scrape skipped: another scrape job is running")
		return
	}
	defer scrapejob.Unlock()

	log.Println("menu scrape starting")
	if err := scrapejob.Run(scrapejob.DefaultOptions(time.Now().In(loc))); err != nil {
		log.Printf("menu scrape failed: %v", err)
		return
	}
	log.Println("menu scrape complete")
}

// deriveRefreshTicks turns the halls' stored operating hours for a date into a
// refresh plan: one tick shortly before each service block opens, then hourly
// while it is open, unioned across halls and coalesced so overlapping halls do
// not each buy their own run.
//
// Only the halls whose menus are actually scraped contribute; the stored hours
// cover every campus venue, most of which have no menu to refresh.
func deriveRefreshTicks(hours []models.LocationOperatingTimes, date string) []refreshTick {
	var ticks []refreshTick

	for _, location := range hours {
		if !isScrapedHall(location.Name) {
			continue
		}
		for _, day := range location.Week {
			if strings.TrimSpace(day.Date) != date {
				continue
			}
			if strings.EqualFold(strings.TrimSpace(day.Status), "closed") {
				continue
			}
			for _, block := range day.Hours {
				ticks = append(ticks, ticksForBlock(block)...)
			}
		}
	}

	return coalesceTicks(ticks)
}

// ticksForBlock plans the refreshes for one open period: refreshLeadMinutes
// before it opens, then every refreshIntervalMinutes until it closes.
func ticksForBlock(block models.HourlyTimes) []refreshTick {
	start := block.StartHour*60 + block.StartMinutes
	end := block.EndHour*60 + block.EndMinutes
	if start < 0 || end <= start {
		return nil
	}

	var ticks []refreshTick
	for at := start - refreshLeadMinutes; at < end; at += refreshIntervalMinutes {
		if at < 0 {
			continue
		}
		if at >= 24*60 {
			break
		}
		// A pre-open tick belongs to the meal the block is about to serve, not
		// to whatever the clock says 15 minutes earlier.
		mealAt := at
		if mealAt < start {
			mealAt = start
		}
		ticks = append(ticks, refreshTick{at: minutesToClock(at), meal: mealForMinutes(mealAt)})
	}

	return ticks
}

// coalesceTicks sorts ticks and merges ones close enough together to be served
// by a single run, which refreshes every hall at once anyway.
func coalesceTicks(ticks []refreshTick) []refreshTick {
	if len(ticks) == 0 {
		return nil
	}

	sort.SliceStable(ticks, func(i, j int) bool {
		if a, b := ticks[i].at.minutes(), ticks[j].at.minutes(); a != b {
			return a < b
		}
		return mealRank(ticks[i].meal) < mealRank(ticks[j].meal)
	})

	out := []refreshTick{ticks[0]}
	for _, tick := range ticks[1:] {
		last := &out[len(out)-1]
		if tick.at.minutes()-last.at.minutes() <= refreshCoalesceMinutes {
			// Two halls want a run at nearly the same moment. Keep the earlier
			// time, but prefer the later meal: at a boundary the meal about to
			// be served is the one whose menu is worth re-reading.
			if mealRank(tick.meal) > mealRank(last.meal) {
				last.meal = tick.meal
			}
			continue
		}
		out = append(out, tick)
	}

	return out
}

// capRefreshTicks thins a plan down to the daily budget, keeping the first and
// last ticks and spreading the rest evenly, so trimming costs resolution rather
// than coverage of the evening meal.
func capRefreshTicks(ticks []refreshTick, max int) []refreshTick {
	if max < 1 {
		return nil
	}
	if len(ticks) <= max {
		return ticks
	}
	if max == 1 {
		return ticks[:1]
	}

	kept := make([]refreshTick, 0, max)
	for i := range max {
		kept = append(kept, ticks[i*(len(ticks)-1)/(max-1)])
	}
	return kept
}

// fixedRefreshTicks is the fallback plan, with meals derived from the clock.
func fixedRefreshTicks() []refreshTick {
	ticks := make([]refreshTick, 0, len(fallbackRefreshTicks))
	for _, at := range fallbackRefreshTicks {
		ticks = append(ticks, refreshTick{at: at, meal: mealForMinutes(at.minutes())})
	}
	return ticks
}

// storedOperatingHours reads the halls' hours, preferring the in-memory store
// and falling back to the database when the store has not been filled yet
// (which is the normal case for the first scheduled job after a deploy).
func storedOperatingHours() []models.LocationOperatingTimes {
	if hours := store.GetLocationOperatingTimes(); len(hours) > 0 {
		return hours
	}
	if db.DB == nil {
		return nil
	}

	hours, err := db.GetLocationOperatingTimes()
	if err != nil {
		log.Printf("could not read operating hours for refresh planning: %v", err)
		return nil
	}
	return hours
}

// isScrapedHall reports whether an operating-hours entry is one of the dining
// halls whose menus are scraped. The hours feed names venues in full ("Allison
// Dining Commons", "Foster Walker Plex East") while the scraper uses short
// names, so entries are matched by containment.
func isScrapedHall(name string) bool {
	lower := strings.ToLower(strings.TrimSpace(name))
	if lower == "" {
		return false
	}

	for _, location := range scraper.DefaultConfig.Locations {
		if strings.Contains(lower, strings.ToLower(location.Name)) {
			return true
		}
	}
	return false
}

// mealForMinutes maps a wall-clock minute-of-day to the meal being served.
func mealForMinutes(minutes int) string {
	switch {
	case minutes < breakfastEndMinutes:
		return "Breakfast"
	case minutes < lunchEndMinutes:
		return "Lunch"
	default:
		return "Dinner"
	}
}

func mealRank(meal string) int {
	switch strings.ToLower(strings.TrimSpace(meal)) {
	case "breakfast":
		return 0
	case "lunch":
		return 1
	case "dinner":
		return 2
	default:
		return -1
	}
}

// mealOrClock returns the tick's meal, deriving it from when it fires if the
// tick did not name one.
func (t refreshTick) mealOrClock(fireTime time.Time) string {
	if meal := strings.TrimSpace(t.meal); meal != "" {
		return meal
	}
	return mealForMinutes(fireTime.Hour()*60 + fireTime.Minute())
}

// fullScrapeTimes returns the full scrape's daily run times: SCRAPE_HOURS_CST
// (on the hour) when set, otherwise the early-morning default.
func fullScrapeTimes() []clockTime {
	hours := parseHoursEnv("SCRAPE_HOURS_CST", nil)
	if len(hours) == 0 {
		return defaultFullScrapeTimes
	}

	times := make([]clockTime, 0, len(hours))
	for _, h := range hours {
		times = append(times, clockTime{hour: h})
	}
	return times
}

// parseRefreshTicks reads a comma-separated refresh plan from the named env
// var. Each entry is "H:MM" or "H:MM=Meal"; without a meal the tick decides
// from the clock when it fires. Returns nil when unset or fully invalid, which
// leaves the plan to be derived from operating hours.
func parseRefreshTicks(envName string) []refreshTick {
	raw := strings.TrimSpace(os.Getenv(envName))
	if raw == "" {
		return nil
	}

	seen := make(map[clockTime]bool)
	var ticks []refreshTick
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		meal := ""
		if timePart, mealPart, found := strings.Cut(part, "="); found {
			part = strings.TrimSpace(timePart)
			meal = strings.TrimSpace(mealPart)
			if mealRank(meal) < 0 {
				log.Printf("ignoring %s entry %q: unknown meal", envName, mealPart)
				continue
			}
		}

		at, ok := parseClockTime(part)
		if !ok {
			log.Printf("ignoring invalid %s entry %q", envName, part)
			continue
		}
		if seen[at] {
			continue
		}
		seen[at] = true
		ticks = append(ticks, refreshTick{at: at, meal: meal})
	}

	if len(ticks) == 0 {
		log.Printf("%s=%q had no valid entries; deriving refresh ticks from operating hours", envName, raw)
		return nil
	}

	sort.SliceStable(ticks, func(i, j int) bool { return ticks[i].at.minutes() < ticks[j].at.minutes() })
	return ticks
}

// disabledByEnv reports whether a kill-switch env var is set to "false".
func disabledByEnv(envName string) bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv(envName)), "false")
}

func describeTicks(ticks []refreshTick) string {
	if len(ticks) == 0 {
		return "(none)"
	}

	parts := make([]string, 0, len(ticks))
	for _, tick := range ticks {
		if tick.meal == "" {
			parts = append(parts, tick.at.String())
			continue
		}
		parts = append(parts, tick.at.String()+" "+tick.meal)
	}
	return strings.Join(parts, ", ")
}

func describeClockTimes(times []clockTime) string {
	parts := make([]string, 0, len(times))
	for _, t := range times {
		parts = append(parts, t.String())
	}
	return strings.Join(parts, ", ")
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

// parseHoursEnv reads a comma-separated list of hours (0-23) from the named env
// var into a sorted, de-duplicated slice, falling back to def when unset or
// fully invalid. Shared by the scrape and mailing schedulers.
func parseHoursEnv(envName string, def []int) []int {
	raw := strings.TrimSpace(os.Getenv(envName))
	if raw == "" {
		return def
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
			log.Printf("ignoring invalid %s entry %q", envName, part)
			continue
		}
		if !seen[h] {
			seen[h] = true
			hours = append(hours, h)
		}
	}

	if len(hours) == 0 {
		log.Printf("%s=%q had no valid hours; using default %v", envName, raw, def)
		return def
	}

	sort.Ints(hours)
	return hours
}
