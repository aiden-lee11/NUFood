package scrapejob

import (
	"backend/internal/scraper"
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
