package scraper

import (
	"backend/internal/models"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseItems(t *testing.T) {
	response := models.DiningHallResponse{
		Date: "2026-07-10",
		Period: models.Periods{Categories: []models.Category{
			{
				Name: "Comfort",
				Items: []models.Item{
					{
						Name:        "Pancakes",
						Description: "Fresh pancakes",
						Portion:     "2 each",
						Ingredients: "  Flour, Eggs, Milk  ",
						Filters: []models.Filter{
							{Name: " Milk "},
							{Name: "Milk"},
							{Name: ""},
							{Name: "Wheat*"},
							{Name: "Good Source of Protein"},
						},
						Nutrients: []models.Nutrient{
							{Name: "Calories", Value: "250"},
							{Name: "Protein (g)", Value: "8"},
						},
					},
					{Name: "Butter"},
					{Name: "   "},
				},
			},
			{
				Name:  "planet eats (cold)",
				Items: []models.Item{{Name: "Filtered ingredient"}},
			},
		}},
	}

	dailyItems, allDataItems, err := parseItems(response, "Allison", "Breakfast")
	require.NoError(t, err)
	require.Len(t, dailyItems, 1)
	assert.Equal(t, "Pancakes", dailyItems[0].Name)
	assert.Equal(t, "2026-07-10", dailyItems[0].Date)
	assert.Equal(t, "250", dailyItems[0].Calories)
	assert.Equal(t, "8", dailyItems[0].Protein)
	assert.Equal(t, "Flour, Eggs, Milk", dailyItems[0].Ingredients)
	// Names are kept verbatim (including "may contain" and marketing tags),
	// trimmed, deduped, and in first-seen order.
	assert.Equal(t, []string{"Milk", "Wheat*", "Good Source of Protein"}, dailyItems[0].Filters)
	assert.Equal(t, []models.AllDataItem{{Name: "Pancakes"}}, allDataItems)
}

func TestParseItemsRejectsDecoyMenu(t *testing.T) {
	decoy := func(station string, n int) models.Category {
		items := make([]models.Item, n)
		for i := range items {
			items[i] = models.Item{ID: "690cbb70021b39505ff999fb", Name: "Caesar Salad", Portion: "—"}
		}
		return models.Category{Name: station, Items: items}
	}
	response := models.DiningHallResponse{
		Date: "2026-08-08",
		Period: models.Periods{Categories: []models.Category{
			decoy("Comfort 1", 1),
			decoy("Comfort 2", 10),
			decoy("Bakery-Dessert", 1),
		}},
	}

	if _, _, err := parseItems(response, "Allison", "Breakfast"); err == nil {
		t.Fatal("parseItems accepted a decoy menu (every item one repeated placeholder)")
	}

	// Distinct IDs — even with duplicate display names — must still parse:
	// a real menu can legitimately repeat a name across stations.
	real := models.DiningHallResponse{
		Date: "2026-08-08",
		Period: models.Periods{Categories: []models.Category{
			{Name: "Comfort 1", Items: []models.Item{
				{ID: "a1", Name: "Caesar Salad"},
				{ID: "a2", Name: "Caesar Salad"},
				{ID: "a3", Name: "Grilled Chicken"},
			}},
		}},
	}
	daily, _, err := parseItems(real, "Allison", "Lunch")
	if err != nil {
		t.Fatalf("parseItems rejected a real menu with duplicate names: %v", err)
	}
	if len(daily) != 3 {
		t.Fatalf("expected 3 items, got %d", len(daily))
	}

	// Legacy payloads without item IDs must never trip the detector.
	noIDs := models.DiningHallResponse{
		Date: "2026-08-08",
		Period: models.Periods{Categories: []models.Category{
			{Name: "Comfort 1", Items: []models.Item{{Name: "Pancakes"}, {Name: "Waffles"}, {Name: "Toast"}}},
		}},
	}
	if _, _, err := parseItems(noIDs, "Allison", "Breakfast"); err != nil {
		t.Fatalf("parseItems rejected an ID-less menu: %v", err)
	}
}

func TestParseItemsAlwaysEmitsFilterSlice(t *testing.T) {
	response := models.DiningHallResponse{
		Date: "2026-07-10",
		Period: models.Periods{Categories: []models.Category{
			{Name: "Comfort", Items: []models.Item{{Name: "Toast"}}},
		}},
	}

	dailyItems, _, err := parseItems(response, "Allison", "Breakfast")
	require.NoError(t, err)
	require.Len(t, dailyItems, 1)
	// Non-nil so the API serializes [] rather than null.
	require.NotNil(t, dailyItems[0].Filters)
	assert.Empty(t, dailyItems[0].Filters)
}

func TestParseItemsRequiresDate(t *testing.T) {
	_, _, err := parseItems(models.DiningHallResponse{}, "Allison", "Breakfast")
	assert.Error(t, err)
}

func TestParseLocationOperatingTimes(t *testing.T) {
	locations := []models.LocationOperatingInfo{
		{
			Name: "Allison",
			Week: []models.DailyOperatingInfo{{
				Day:    5,
				Date:   "2026-07-10",
				Status: "open",
				Hours: []models.HourlyOperatingInfo{{
					StartHour: 7,
					EndHour:   20,
				}},
			}},
		},
		{Name: "   "},
	}

	operatingTimes, err := parseLocationOperatingTimes(locations)
	require.NoError(t, err)
	require.Len(t, operatingTimes, 1)
	assert.Equal(t, "Allison", operatingTimes[0].Name)
	require.Len(t, operatingTimes[0].Week, 1)
	assert.Equal(t, "2026-07-10", operatingTimes[0].Week[0].Date)
}
