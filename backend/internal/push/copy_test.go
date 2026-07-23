package push

import (
	"backend/internal/models"
	"testing"
)

func item(name, location string) models.DailyItem {
	return models.DailyItem{Name: name, Location: location, StationName: "Station"}
}

func itemAtStation(name, location, station string) models.DailyItem {
	return models.DailyItem{Name: name, Location: location, StationName: station}
}

func TestBuildNotification(t *testing.T) {
	tests := []struct {
		name      string
		meal      string
		items     []models.DailyItem
		wantTitle string
		wantBody  string
	}{
		{
			name:      "no items",
			meal:      "Dinner",
			items:     nil,
			wantTitle: "",
			wantBody:  "",
		},
		{
			name:      "single item",
			meal:      "Dinner",
			items:     []models.DailyItem{item("Pizza", "Sargent")},
			wantTitle: "Dinner favorites",
			wantBody:  "Pizza is at Sargent for dinner.",
		},
		{
			name:      "two items same location",
			meal:      "Lunch",
			items:     []models.DailyItem{item("Pizza", "Sargent"), item("Tacos", "Sargent")},
			wantTitle: "Lunch favorites",
			wantBody:  "Pizza and Tacos at Sargent for lunch.",
		},
		{
			name:      "two items different location",
			meal:      "Breakfast",
			items:     []models.DailyItem{item("Pancakes", "Elder"), item("Waffles", "Allison")},
			wantTitle: "Breakfast favorites",
			wantBody:  "Pancakes at Elder and Waffles at Allison for breakfast.",
		},
		{
			name: "three plus single location",
			meal: "Dinner",
			items: []models.DailyItem{
				item("Pizza", "Sargent"),
				item("Tacos", "Sargent"),
				item("Salad", "Sargent"),
			},
			wantTitle: "Dinner favorites",
			wantBody:  "3 favorites at Sargent for dinner — open NUFood to see them.",
		},
		{
			name: "three plus multi location clear majority",
			meal: "Dinner",
			items: []models.DailyItem{
				item("Pizza", "Sargent"),
				item("Tacos", "Sargent"),
				item("Salad", "Sargent"),
				item("Soup", "Elder"),
			},
			wantTitle: "Dinner favorites",
			wantBody:  "3 favorites at Sargent, plus 1 more at Elder — open NUFood to see them.",
		},
		{
			name: "station dedupe",
			meal: "Lunch",
			items: []models.DailyItem{
				itemAtStation("Pizza", "Sargent", "Comfort"),
				itemAtStation("Pizza", "Sargent", "Grill"),
			},
			wantTitle: "Lunch favorites",
			wantBody:  "Pizza is at Sargent for lunch.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotTitle, gotBody := BuildNotification(tt.meal, tt.items)
			if gotTitle != tt.wantTitle {
				t.Errorf("title = %q, want %q", gotTitle, tt.wantTitle)
			}
			if gotBody != tt.wantBody {
				t.Errorf("body = %q, want %q", gotBody, tt.wantBody)
			}
		})
	}
}

func TestBuildNotificationLongFallback(t *testing.T) {
	items := []models.DailyItem{
		item("Grilled Chicken Sandwich Deluxe", "Sargent Dining Commons"),
		item("Roasted Vegetable Medley Bowl", "Sargent Dining Commons"),
		item("Fresh Garden Caesar Salad", "Elder Dining Hall"),
		item("Homemade Tomato Basil Soup", "Allison Dining Commons"),
		item("Belgian Waffle Breakfast Bar", "Plex West Dining"),
		item("Stone Fired Margherita Pizza", "Norris Food Court"),
	}

	title, body := BuildNotification("Dinner", items)
	if title != "Dinner favorites" {
		t.Fatalf("title = %q", title)
	}

	want := "6 favorites coming up at Sargent Dining Commons, Allison Dining Commons, Elder Dining Hall, Norris Food Court & Plex West Dining."
	if body != want {
		t.Errorf("body = %q, want %q", body, want)
	}
	if len(body) > bodyHardMax {
		t.Errorf("body length %d exceeds hard max %d", len(body), bodyHardMax)
	}
}

func TestBuildNotificationNeverExceedsHardMax(t *testing.T) {
	longLoc := "This Is An Absurdly Long Dining Hall Location Name That Should Never Occur In Practice But Must Still Be Clamped"
	items := []models.DailyItem{
		item("Item One", longLoc),
		item("Item Two", longLoc+" Two"),
		item("Item Three", longLoc+" Three"),
	}
	_, body := BuildNotification("Lunch", items)
	if len(body) > bodyHardMax {
		t.Errorf("body length %d exceeds hard max %d: %q", len(body), bodyHardMax, body)
	}
}
