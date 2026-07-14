package scheduler

import (
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

func TestScrapeHoursParsing(t *testing.T) {
	t.Setenv("SCRAPE_HOURS_CST", " 18, 6 , 6 ,25,foo ")
	got := scrapeHours()
	want := []int{6, 18} // sorted + de-duped, invalid entries dropped
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v, want %v", got, want)
		}
	}
}
