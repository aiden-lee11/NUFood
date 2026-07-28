package scrapejob

import (
	"backend/internal/db"
	"backend/internal/models"
	"backend/internal/scraper"
	"errors"
	"testing"
)

func key(location, date, period string) scraper.MenuKey {
	return scraper.MenuKey{Location: location, Date: date, Period: period}
}

// The freshness tracker is what lets a refresh skip parsing and writing a menu
// upstream has not edited.
func TestMenuUnchanged(t *testing.T) {
	ResetFreshness()
	t.Cleanup(ResetFreshness)

	allisonLunch := key("Allison", "2026-07-27", "Lunch")

	if menuUnchanged(allisonLunch, "2026-07-27T17:04:04Z") {
		t.Fatal("a menu that has never been seen must not be treated as unchanged")
	}

	rememberMenus(map[scraper.MenuKey]string{allisonLunch: "2026-07-27T17:04:04Z"})

	if !menuUnchanged(allisonLunch, "2026-07-27T17:04:04Z") {
		t.Fatal("the same stamp must be recognized as unchanged")
	}
	if menuUnchanged(allisonLunch, "2026-07-27T18:30:00Z") {
		t.Fatal("a newer stamp must be treated as changed")
	}
	if menuUnchanged(key("Sargent", "2026-07-27", "Lunch"), "2026-07-27T17:04:04Z") {
		t.Fatal("stamps must not leak between locations")
	}
	if menuUnchanged(key("Allison", "2026-07-28", "Lunch"), "2026-07-27T17:04:04Z") {
		t.Fatal("stamps must not leak between dates")
	}
	if menuUnchanged(key("Allison", "2026-07-27", "Dinner"), "2026-07-27T17:04:04Z") {
		t.Fatal("stamps must not leak between periods")
	}
}

// Without a stamp there is no evidence the menu is untouched, so it must be
// reparsed rather than skipped.
func TestMenuUnchangedIgnoresEmptyStamps(t *testing.T) {
	ResetFreshness()
	t.Cleanup(ResetFreshness)

	allisonLunch := key("Allison", "2026-07-27", "Lunch")
	rememberMenus(map[scraper.MenuKey]string{allisonLunch: ""})

	if menuUnchanged(allisonLunch, "") {
		t.Fatal("an empty stamp must never match")
	}
}

// A full scrape rebuilds the tracker from scratch so stamps for dates that have
// aged out of the window cannot linger.
func TestReplaceMenusDropsStaleEntries(t *testing.T) {
	ResetFreshness()
	t.Cleanup(ResetFreshness)

	stale := key("Allison", "2026-07-01", "Lunch")
	fresh := key("Allison", "2026-07-27", "Lunch")

	rememberMenus(map[scraper.MenuKey]string{stale: "old-stamp"})
	replaceMenus(map[scraper.MenuKey]string{fresh: "new-stamp"})

	if menuUnchanged(stale, "old-stamp") {
		t.Fatal("a full scrape must forget stamps outside its window")
	}
	if !menuUnchanged(fresh, "new-stamp") {
		t.Fatal("a full scrape must repopulate the tracker with what it saw")
	}
}

func TestNormalizeMeal(t *testing.T) {
	cases := map[string]string{
		"  lunch ": "Lunch",
		"DINNER":   "Dinner",
		"Brunch":   "Brunch",
		"":         "",
		"   ":      "",
	}

	for input, want := range cases {
		if got := normalizeMeal(input); got != want {
			t.Fatalf("normalizeMeal(%q) = %q, want %q", input, got, want)
		}
	}
}

const (
	planDate = "2026-07-27"
	planMeal = "Dinner"
)

func dinnerItem(location, name string) models.DailyItem {
	return models.DailyItem{Name: name, Date: planDate, Location: location, TimeOfDay: planMeal}
}

func periodStrings(periods []db.MenuPeriod) []string {
	out := make([]string, 0, len(periods))
	for _, period := range periods {
		out = append(out, period.Location+" "+period.TimeOfDay)
	}
	return out
}

func assertPeriods(t *testing.T, got []db.MenuPeriod, want []string) {
	t.Helper()
	gotStrings := periodStrings(got)
	if len(gotStrings) != len(want) {
		t.Fatalf("got %v, want %v", gotStrings, want)
	}
	for i := range want {
		if gotStrings[i] != want[i] {
			t.Fatalf("got %v, want %v", gotStrings, want)
		}
	}
}

// The destructive case: a hall that answers but hands back nothing. Upstream
// publishes the evening menu late, so an empty answer is far more often "not up
// yet" than "not serving" — clearing the slice on it empties the menu the push
// is about to read.
func TestPlanPeriodRefreshPreservesUnverifiedEmptyResults(t *testing.T) {
	results := []scraper.PeriodScrapeResult{
		// Fetched the period list, which had no Dinner in it yet.
		{Location: "Allison", Fetched: true},
		// Fetched the menu itself, but it had no categories yet.
		{Location: "Sargent", Fetched: true, Matched: true, MatchedPeriod: "Dinner"},
		{Location: "Elder", Fetched: true, Matched: true, MatchedPeriod: "Dinner",
			DailyItems: []models.DailyItem{dinnerItem("Elder", "Roast Chicken")}},
	}

	plan := planPeriodRefresh(planDate, planMeal, results)

	assertPeriods(t, plan.periods, []string{"Elder Dinner"})
	if len(plan.weeklyItems) != 1 {
		t.Fatalf("only the hall with a real menu may be rewritten, got %d items", len(plan.weeklyItems))
	}
	if len(plan.preserved) != 2 || plan.preserved[0] != "Allison" || plan.preserved[1] != "Sargent" {
		t.Fatalf("expected Allison and Sargent to be left alone, got %v", plan.preserved)
	}
	if len(plan.failed) != 0 {
		t.Fatalf("an empty answer is not a failure, got %v", plan.failed)
	}
}

// A closure upstream actually states is real information, and clearing the
// slice is the only way to stop announcing a meal that is not being served.
func TestPlanPeriodRefreshClearsVerifiedClosures(t *testing.T) {
	results := []scraper.PeriodScrapeResult{
		{Location: "Allison", Fetched: true, Matched: true, MatchedPeriod: "Dinner", ClosedVerified: true},
	}

	plan := planPeriodRefresh(planDate, planMeal, results)

	assertPeriods(t, plan.periods, []string{"Allison Dinner"})
	if len(plan.weeklyItems) != 0 {
		t.Fatalf("a verified closure must write no rows, got %d", len(plan.weeklyItems))
	}
	if len(plan.preserved) != 0 {
		t.Fatalf("a verified closure must not be preserved, got %v", plan.preserved)
	}
}

// A failed fetch and an unedited menu are both untouchable, and a hall serving
// the meal under an alias must have both names cleared or the rows double up.
func TestPlanPeriodRefreshSkipsFailedAndUnchangedHalls(t *testing.T) {
	results := []scraper.PeriodScrapeResult{
		{Location: "Allison", Err: errors.New("browser gone")},
		{Location: "Sargent", Fetched: true, Matched: true, MatchedPeriod: "Dinner", Unchanged: true},
		{Location: "Elder", Fetched: true, Matched: true, MatchedPeriod: "Brunch",
			DailyItems: []models.DailyItem{dinnerItem("Elder", "Waffles")}},
	}

	plan := planPeriodRefresh(planDate, "Lunch", results)

	assertPeriods(t, plan.periods, []string{"Elder Lunch", "Elder Brunch"})
	if plan.unchanged != 1 {
		t.Fatalf("unchanged = %d, want 1", plan.unchanged)
	}
	if len(plan.failed) != 1 || plan.failed[0] != "Allison" {
		t.Fatalf("expected Allison to be reported as failed, got %v", plan.failed)
	}
	for _, period := range plan.periods {
		if period.Date != planDate {
			t.Fatalf("period %s carries the wrong date", period)
		}
	}
}

// The scrape lock is shared with the HTTP handlers and the scheduler; a caller
// that finds it held must be told, not blocked.
func TestTryLockIsExclusive(t *testing.T) {
	if !TryLock() {
		t.Fatal("expected to claim a free lock")
	}
	if TryLock() {
		Unlock()
		t.Fatal("expected the second claim to fail while the lock is held")
	}
	Unlock()

	if !TryLock() {
		t.Fatal("expected the lock to be claimable again after release")
	}
	Unlock()
}
