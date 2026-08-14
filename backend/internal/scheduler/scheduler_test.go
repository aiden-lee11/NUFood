package scheduler

import (
	"backend/internal/models"
	"testing"
	"time"
)

func mustChicago(t *testing.T) *time.Location {
	t.Helper()
	loc, err := time.LoadLocation(campusZone)
	if err != nil {
		t.Fatalf("load %s: %v", campusZone, err)
	}
	return loc
}

func TestNextRun(t *testing.T) {
	loc := mustChicago(t)
	hours := []int{6, 18}

	cases := []struct {
		name string
		now  time.Time
		want time.Time
	}{
		{
			name: "before morning slot -> 6am today",
			now:  time.Date(2026, 7, 10, 3, 0, 0, 0, loc),
			want: time.Date(2026, 7, 10, 6, 0, 0, 0, loc),
		},
		{
			name: "between slots -> 6pm today",
			now:  time.Date(2026, 7, 10, 9, 30, 0, 0, loc),
			want: time.Date(2026, 7, 10, 18, 0, 0, 0, loc),
		},
		{
			name: "after last slot -> 6am tomorrow",
			now:  time.Date(2026, 7, 10, 20, 0, 0, 0, loc),
			want: time.Date(2026, 7, 11, 6, 0, 0, 0, loc),
		},
		{
			name: "exactly on a slot -> next slot, not now",
			now:  time.Date(2026, 7, 10, 6, 0, 0, 0, loc),
			want: time.Date(2026, 7, 10, 18, 0, 0, 0, loc),
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := nextRun(c.now, hours, loc)
			if !got.Equal(c.want) {
				t.Fatalf("nextRun(%s) = %s, want %s", c.now, got, c.want)
			}
		})
	}
}

// A UTC "now" must still resolve to the correct Chicago wall-clock slot.
func TestNextRunFromUTCClock(t *testing.T) {
	loc := mustChicago(t)
	// 2026-07-11 00:30 UTC == 2026-07-10 19:30 CDT (after the 18:00 slot).
	now := time.Date(2026, 7, 11, 0, 30, 0, 0, time.UTC)
	got := nextRun(now, []int{6, 18}, loc)
	want := time.Date(2026, 7, 11, 6, 0, 0, 0, loc)
	if !got.Equal(want) {
		t.Fatalf("nextRun(%s) = %s, want %s", now, got, want)
	}
}

func TestFullScrapeTimesFromEnv(t *testing.T) {
	t.Setenv("SCRAPE_HOURS_CST", " 18, 6 , 6 ,25,foo ")
	got := fullScrapeTimes()
	want := []clockTime{{6, 0}, {18, 0}} // sorted + de-duped, invalid entries dropped
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v, want %v", got, want)
		}
	}
}

// With no override the full scrape runs once, early in the morning.
func TestFullScrapeTimesDefault(t *testing.T) {
	t.Setenv("SCRAPE_HOURS_CST", "")
	got := fullScrapeTimes()
	if len(got) != 1 || got[0] != (clockTime{6, 0}) {
		t.Fatalf("got %v, want [06:00]", got)
	}
}

func hallHours(name, date string, blocks ...models.HourlyTimes) models.LocationOperatingTimes {
	return models.LocationOperatingTimes{
		Name: name,
		Week: []models.DailyOperatingTimes{{Date: date, Status: "open", Hours: blocks}},
	}
}

func block(startHour, startMinute, endHour, endMinute int) models.HourlyTimes {
	return models.HourlyTimes{
		StartHour: startHour, StartMinutes: startMinute,
		EndHour: endHour, EndMinutes: endMinute,
	}
}

func tickStrings(ticks []refreshTick) []string {
	out := make([]string, 0, len(ticks))
	for _, tick := range ticks {
		out = append(out, tick.at.String()+" "+tick.meal)
	}
	return out
}

func assertTicks(t *testing.T, got []refreshTick, want []string) {
	t.Helper()
	gotStrings := tickStrings(got)
	if len(gotStrings) != len(want) {
		t.Fatalf("got %v (%d ticks), want %v (%d)", gotStrings, len(gotStrings), want, len(want))
	}
	for i := range want {
		if gotStrings[i] != want[i] {
			t.Fatalf("got %v, want %v", gotStrings, want)
		}
	}
}

// A summer day: three separate service blocks at one hall.
func TestDeriveRefreshTicksFromServiceBlocks(t *testing.T) {
	date := "2026-07-27"
	hours := []models.LocationOperatingTimes{
		hallHours("Allison Dining Commons", date,
			block(7, 30, 9, 30),
			block(11, 0, 13, 30),
			block(17, 0, 19, 0),
		),
	}

	assertTicks(t, deriveRefreshTicks(hours, date), []string{
		"07:15 Breakfast", "08:15 Breakfast", "09:15 Breakfast",
		"10:45 Lunch", "11:45 Lunch", "12:45 Lunch",
		"16:45 Dinner", "17:45 Dinner", "18:45 Dinner",
	})
}

// A continuous school-year block spans several meals, so the meal comes from
// each tick's own position in the day.
func TestDeriveRefreshTicksAcrossAContinuousBlock(t *testing.T) {
	date := "2026-04-15"
	hours := []models.LocationOperatingTimes{
		hallHours("Elder Dining Commons", date, block(7, 0, 20, 0)),
	}

	assertTicks(t, deriveRefreshTicks(hours, date), []string{
		"06:45 Breakfast", "07:45 Breakfast", "08:45 Breakfast", "09:45 Breakfast",
		"10:45 Lunch", "11:45 Lunch", "12:45 Lunch", "13:45 Lunch", "14:45 Lunch",
		"15:45 Dinner", "16:45 Dinner", "17:45 Dinner", "18:45 Dinner", "19:45 Dinner",
	})
}

// Halls opening at nearly the same time must share one run, not buy two.
func TestDeriveRefreshTicksCoalescesAcrossHalls(t *testing.T) {
	date := "2026-09-20"
	hours := []models.LocationOperatingTimes{
		hallHours("Allison Dining Commons", date, block(11, 0, 13, 0)),
		hallHours("Sargent Dining Commons", date, block(11, 10, 13, 0)),
		hallHours("Foster Walker Plex East", date, block(11, 15, 14, 0)),
	}

	// Raw ticks are 10:45/10:55/11:00, 11:45/11:55/12:00 and 12:45/12:55/13:00;
	// each cluster collapses to one run, since a run refreshes every hall.
	assertTicks(t, deriveRefreshTicks(hours, date), []string{
		"10:45 Lunch", "11:45 Lunch", "12:45 Lunch",
	})
}

// Venues without scraped menus (cafes, markets) must not add refresh runs, and
// closed days contribute nothing.
func TestDeriveRefreshTicksIgnoresIrrelevantEntries(t *testing.T) {
	date := "2026-09-20"
	hours := []models.LocationOperatingTimes{
		hallHours("Harry's Cafe", date, block(7, 0, 14, 0)),
		hallHours("The Market at Norris", date, block(8, 0, 20, 0)),
		{
			Name: "Sargent Dining Commons",
			Week: []models.DailyOperatingTimes{{Date: date, Status: "closed"}},
		},
		hallHours("Allison Dining Commons", "2026-09-21", block(7, 0, 9, 0)),
	}

	if got := deriveRefreshTicks(hours, date); len(got) != 0 {
		t.Fatalf("expected no ticks, got %v", tickStrings(got))
	}
}

func TestDeriveRefreshTicksSkipsMalformedBlocks(t *testing.T) {
	date := "2026-09-20"
	hours := []models.LocationOperatingTimes{
		hallHours("Allison Dining Commons", date,
			block(13, 0, 11, 0), // ends before it starts
			block(11, 0, 11, 0), // zero length
			block(17, 0, 19, 0), // the only usable block
		),
	}

	assertTicks(t, deriveRefreshTicks(hours, date), []string{
		"16:45 Dinner", "17:45 Dinner", "18:45 Dinner",
	})
}

// With no stored hours the fixed fallback plan takes over.
func TestFixedRefreshTicksFallback(t *testing.T) {
	assertTicks(t, fixedRefreshTicks(), []string{
		"07:15 Breakfast", "08:15 Breakfast", "09:15 Breakfast",
		"10:45 Lunch", "11:45 Lunch", "12:45 Lunch",
		"16:15 Dinner", "17:15 Dinner", "18:15 Dinner",
	})

	if got := deriveRefreshTicks(nil, "2026-09-20"); len(got) != 0 {
		t.Fatalf("no hours data must derive no ticks, got %v", tickStrings(got))
	}
}

// The daily budget is a hard cap, and thinning must keep the whole day covered
// rather than dropping the evening.
func TestCapRefreshTicks(t *testing.T) {
	date := "2026-04-15"
	// An unusually long single block, so the derived plan overruns the budget
	// and thinning actually has to engage.
	hours := []models.LocationOperatingTimes{
		hallHours("Elder Dining Commons", date, block(6, 30, 22, 0)),
	}

	derived := deriveRefreshTicks(hours, date)
	if len(derived) <= maxRefreshRunsPerDay {
		t.Fatalf("expected the raw plan to exceed the cap, got %d", len(derived))
	}

	capped := capRefreshTicks(derived, maxRefreshRunsPerDay)
	if len(capped) != maxRefreshRunsPerDay {
		t.Fatalf("capped plan has %d ticks, want %d", len(capped), maxRefreshRunsPerDay)
	}
	if capped[0] != derived[0] {
		t.Fatalf("capping must keep the first tick")
	}
	if capped[len(capped)-1] != derived[len(derived)-1] {
		t.Fatalf("capping must keep the last tick so dinner stays covered")
	}
	for i := 1; i < len(capped); i++ {
		if capped[i].at.minutes() <= capped[i-1].at.minutes() {
			t.Fatalf("capped ticks must stay strictly increasing: %v", tickStrings(capped))
		}
	}

	if got := capRefreshTicks(derived, 0); got != nil {
		t.Fatalf("a zero budget must yield no ticks, got %v", tickStrings(got))
	}
	if got := capRefreshTicks(derived[:3], maxRefreshRunsPerDay); len(got) != 3 {
		t.Fatalf("a plan under the cap must pass through unchanged, got %d", len(got))
	}
}

func TestMealForMinutes(t *testing.T) {
	cases := []struct {
		minutes int
		want    string
	}{
		{0, "Breakfast"},
		{7*60 + 15, "Breakfast"},
		{10*60 + 29, "Breakfast"},
		{10*60 + 30, "Lunch"},
		{12 * 60, "Lunch"},
		{15*60 + 29, "Lunch"},
		{15*60 + 30, "Dinner"},
		{23*60 + 59, "Dinner"},
	}

	for _, c := range cases {
		if got := mealForMinutes(c.minutes); got != c.want {
			t.Fatalf("mealForMinutes(%d) = %q, want %q", c.minutes, got, c.want)
		}
	}
}

// A tick with no meal of its own falls back to the wall clock when it fires.
func TestRefreshTickMealFallsBackToWallClock(t *testing.T) {
	loc := mustChicago(t)
	tick := refreshTick{at: clockTime{16, 15}}
	fireTime := time.Date(2026, 7, 27, 16, 15, 0, 0, loc)

	if got := tick.mealOrClock(fireTime); got != "Dinner" {
		t.Fatalf("got %q, want Dinner", got)
	}

	named := refreshTick{at: clockTime{16, 15}, meal: "Lunch"}
	if got := named.mealOrClock(fireTime); got != "Lunch" {
		t.Fatalf("an explicit meal must win, got %q", got)
	}
}

func TestParseRefreshTicksOverride(t *testing.T) {
	t.Setenv("REFRESH_TICKS_CST", " 10:45=Lunch , 07:15 , 07:15 , 25:00 , 12:60 , nope , 16:15=Supper ")
	assertTicks(t, parseRefreshTicks("REFRESH_TICKS_CST"), []string{"07:15 ", "10:45 Lunch"})

	t.Setenv("REFRESH_TICKS_CST", "")
	if got := parseRefreshTicks("REFRESH_TICKS_CST"); got != nil {
		t.Fatalf("an unset override must derive from operating hours, got %v", tickStrings(got))
	}

	t.Setenv("REFRESH_TICKS_CST", "garbage,also-garbage")
	if got := parseRefreshTicks("REFRESH_TICKS_CST"); got != nil {
		t.Fatalf("a fully invalid override must derive from operating hours, got %v", tickStrings(got))
	}
}

func TestIsScrapedHall(t *testing.T) {
	scraped := []string{
		"Allison Dining Commons",
		"Sargent Dining Commons",
		"Elder Dining Commons",
		"Foster Walker Plex East",
		"Foster Walker Plex West",
	}
	for _, name := range scraped {
		if !isScrapedHall(name) {
			t.Fatalf("%q should be a scraped hall", name)
		}
	}

	notScraped := []string{
		"Harry's Cafe", "The Market at Foster Walker", "Dining Commons | Evanston Campus",
		"847 Burger", "Starbucks", "",
	}
	for _, name := range notScraped {
		if isScrapedHall(name) {
			t.Fatalf("%q should not be a scraped hall", name)
		}
	}
}

// The window before a push send is the one place a refresh can do damage it
// cannot undo, so ticks for that meal are dropped from the plan there — and
// nowhere else.
func TestExcludePreNotifyTicks(t *testing.T) {
	dinnerTicks := []refreshTick{
		{at: clockTime{14, 45}, meal: "Lunch"},  // before the window
		{at: clockTime{15, 30}, meal: "Dinner"}, // window opens
		{at: clockTime{15, 45}, meal: "Dinner"}, // derived plans put one here
		{at: clockTime{16, 15}, meal: "Dinner"}, // the fallback plan's
		{at: clockTime{16, 29}, meal: "Dinner"}, // last blocked minute
		{at: clockTime{16, 30}, meal: "Dinner"}, // the send itself is not blocked
		{at: clockTime{16, 45}, meal: "Dinner"}, // post-send ticks stay
		{at: clockTime{17, 45}, meal: "Dinner"},
		{at: clockTime{18, 45}, meal: "Dinner"},
	}

	assertTicks(t, excludePreNotifyTicks(dinnerTicks, defaultNotifyTimes), []string{
		"14:45 Lunch", "16:30 Dinner", "16:45 Dinner", "17:45 Dinner", "18:45 Dinner",
	})

	// A tick inside the window for a different meal is harmless: the send never
	// reads the slice it rewrites.
	other := []refreshTick{{at: clockTime{16, 0}, meal: "Lunch"}}
	assertTicks(t, excludePreNotifyTicks(other, defaultNotifyTimes), []string{"16:00 Lunch"})

	// Breakfast and lunch sends get the same protection.
	morning := []refreshTick{
		{at: clockTime{6, 0}, meal: "Breakfast"},
		{at: clockTime{6, 45}, meal: "Breakfast"},
		{at: clockTime{9, 45}, meal: "Lunch"},
		{at: clockTime{10, 45}, meal: "Lunch"},
	}
	assertTicks(t, excludePreNotifyTicks(morning, defaultNotifyTimes), []string{
		"06:45 Breakfast", "10:45 Lunch",
	})

	// A tick that names no meal is judged by the meal its own clock time implies.
	unnamed := []refreshTick{{at: clockTime{16, 15}}, {at: clockTime{16, 45}}}
	if got := excludePreNotifyTicks(unnamed, defaultNotifyTimes); len(got) != 1 || got[0].at != (clockTime{16, 45}) {
		t.Fatalf("an unnamed tick must be judged by the clock, got %v", tickStrings(got))
	}

	// With the notify cron off there is nothing to protect.
	assertTicks(t, excludePreNotifyTicks(dinnerTicks, nil), tickStrings(dinnerTicks))
}

// The two plans that actually reach production must come out of the blackout
// without a dinner refresh sitting in front of the 16:30 push.
func TestPlansCarryNoPreNotifyDinnerRefresh(t *testing.T) {
	assertTicks(t, excludePreNotifyTicks(fixedRefreshTicks(), defaultNotifyTimes), []string{
		"07:15 Breakfast", "08:15 Breakfast", "09:15 Breakfast",
		"10:45 Lunch", "11:45 Lunch", "12:45 Lunch",
		"17:15 Dinner", "18:15 Dinner",
	})

	date := "2026-04-15"
	continuous := []models.LocationOperatingTimes{
		hallHours("Elder Dining Commons", date, block(7, 0, 20, 0)),
	}
	assertTicks(t, excludePreNotifyTicks(deriveRefreshTicks(continuous, date), defaultNotifyTimes), []string{
		"06:45 Breakfast", "07:45 Breakfast", "08:45 Breakfast", "09:45 Breakfast",
		"10:45 Lunch", "11:45 Lunch", "12:45 Lunch", "13:45 Lunch", "14:45 Lunch",
		"16:45 Dinner", "17:45 Dinner", "18:45 Dinner", "19:45 Dinner",
	})
}

// ensureTicks is where the blackout is actually applied, so it must hold for a
// hand-configured plan too.
func TestEnsureTicksAppliesTheBlackout(t *testing.T) {
	loc := mustChicago(t)
	s := &menuScheduler{
		loc:            loc,
		refreshEnabled: true,
		notifyTimes:    defaultNotifyTimes,
		overrideTicks: []refreshTick{
			{at: clockTime{12, 45}, meal: "Lunch"},
			{at: clockTime{16, 15}, meal: "Dinner"},
			{at: clockTime{17, 45}, meal: "Dinner"},
		},
	}

	s.ensureTicks(time.Date(2026, 7, 27, 5, 0, 0, 0, loc))
	assertTicks(t, s.ticks, []string{"12:45 Lunch", "17:45 Dinner"})
}

func TestNotifyBlackoutTimes(t *testing.T) {
	t.Setenv("ENABLE_NOTIFY_CRON", "")
	t.Setenv("NOTIFY_TIMES_CST", "")
	if got := notifyBlackoutTimes(); len(got) != len(defaultNotifyTimes) {
		t.Fatalf("got %v, want the notify defaults %v", got, defaultNotifyTimes)
	}

	t.Setenv("NOTIFY_TIMES_CST", "17:00")
	if got := notifyBlackoutTimes(); len(got) != 1 || got[0] != (clockTime{17, 0}) {
		t.Fatalf("the blackout must follow NOTIFY_TIMES_CST, got %v", got)
	}

	t.Setenv("ENABLE_NOTIFY_CRON", "false")
	if got := notifyBlackoutTimes(); got != nil {
		t.Fatalf("no notify cron means no blackout, got %v", got)
	}
}

// The scheduler must pick the soonest job of the day and identify which it is.
func TestNextEvent(t *testing.T) {
	loc := mustChicago(t)
	s := &menuScheduler{
		loc:            loc,
		fullTimes:      []clockTime{{6, 0}},
		refreshEnabled: true,
		ticks: []refreshTick{
			{at: clockTime{7, 15}, meal: "Breakfast"},
			{at: clockTime{16, 45}, meal: "Dinner"},
		},
	}

	at := func(hour, minute int) time.Time {
		return time.Date(2026, 7, 27, hour, minute, 0, 0, loc)
	}

	next, tick, ok := s.nextEvent(at(2, 0))
	if !ok || tick != nil || !next.Equal(at(6, 0)) {
		t.Fatalf("overnight should schedule the full scrape, got %s tick=%v ok=%v", next, tick, ok)
	}

	next, tick, ok = s.nextEvent(at(6, 0))
	if !ok || tick == nil || tick.meal != "Breakfast" || !next.Equal(at(7, 15)) {
		t.Fatalf("after the full scrape the breakfast refresh is next, got %s tick=%v ok=%v", next, tick, ok)
	}

	next, tick, ok = s.nextEvent(at(12, 0))
	if !ok || tick == nil || tick.meal != "Dinner" || !next.Equal(at(16, 45)) {
		t.Fatalf("midday should schedule the dinner refresh, got %s tick=%v ok=%v", next, tick, ok)
	}

	if _, _, ok = s.nextEvent(at(20, 0)); ok {
		t.Fatal("after the last job the day must report no remaining events")
	}

	s.refreshEnabled = false
	if _, tick, ok = s.nextEvent(at(6, 0)); ok && tick != nil {
		t.Fatal("disabled refreshes must not be scheduled")
	}
}

func TestMealForFireTime(t *testing.T) {
	loc := mustChicago(t)
	cases := []struct {
		at   clockTime
		want string
	}{
		{clockTime{6, 30}, "Breakfast"},
		{clockTime{10, 30}, "Lunch"},
		{clockTime{16, 30}, "Dinner"},
		{clockTime{2, 0}, ""},
		{clockTime{23, 30}, ""},
	}

	for _, c := range cases {
		if got := mealForFireMinutes(c.at.minutes()); got != c.want {
			t.Fatalf("mealForFireMinutes(%s) = %q, want %q", c.at, got, c.want)
		}
		fireTime := time.Date(2026, 7, 27, c.at.hour, c.at.minute, 0, 0, loc)
		if got := mealForFireTime(fireTime); got != c.want {
			t.Fatalf("mealForFireTime(%s) = %q, want %q", c.at, got, c.want)
		}
	}
}

