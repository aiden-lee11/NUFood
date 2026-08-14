package main

import (
	"math/rand"
	"testing"
	"time"
)

func TestPlanDayProducesValidFireTimes(t *testing.T) {
	loc, err := time.LoadLocation(centralTZ)
	if err != nil {
		t.Fatalf("load tz: %v", err)
	}
	now := time.Date(2026, 8, 14, 3, 0, 0, 0, loc)
	rng := rand.New(rand.NewSource(1))

	// Run many times so a bad window (negative span) would surface as a panic.
	for i := 0; i < 500; i++ {
		plan := planDay(now, loc, rng)
		if len(plan) != len(windows) {
			t.Fatalf("expected %d sessions, got %d", len(windows), len(plan))
		}
		for j, s := range plan {
			w := windows[j]
			start := time.Date(now.Year(), now.Month(), now.Day(), w.startHour, w.startMin, 0, 0, loc)
			end := time.Date(now.Year(), now.Month(), now.Day(), w.endHour, w.endMin, 0, 0, loc)
			if end.Before(start) {
				t.Fatalf("%s window inverted: start=%s end=%s", w.meal, start, end)
			}
			if s.fire.Before(start) || s.fire.After(end) {
				t.Fatalf("%s fire %s outside window [%s, %s]", w.meal, s.fire, start, end)
			}
		}
	}
}
