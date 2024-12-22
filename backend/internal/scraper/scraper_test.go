package scraper_test

import (
	"backend/internal/models"
	"backend/internal/scraper"
	"encoding/json"
	"fmt"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Total funcs in scraper.go

// func (d *DiningHallScraper) ScrapeFood(date string) ([]db.DailyItem, []db.AllDataItem, error) {
// func (d *DiningHallScraper) ScrapeOperationHours(date string) ([]models.LocationOperation, error) {
// func visitOperationHours(c *colly.Collector, url string) ([]models.LocationOperation, error) {
// func visitDiningHall(c *colly.Collector, url, locationName, timeOfDay string) ([]db.DailyItem, []db.AllDataItem, error) {
// func parseItems(menu models.Menu, location, timeOfDay string) ([]db.DailyItem, []db.AllDataItem, error) {
// func parseOperationHours(locations []models.LocationOperationInfoJSON) ([]models.LocationOperation, error) {

// In the future should add unit tests for all the functions that aren't the parent calls ie (ScrapeFood and ScrapeOperationHours), however since the functions that we test are dependent on these functions
// I am assuming for now that everything is running correctly :D

func TestScrapeFood(t *testing.T) {
	// Define a mock HTTP response
	mockResponse := models.DiningHallResponse{
		Menu: models.Menu{
			Date: "2024-12-16",
			Periods: models.Periods{
				Categories: []models.Category{
					{
						Name: "Comfort",
						Items: []models.Item{
							{Name: "Pancakes", Description: "Delicious pancakes"},
							// Test of flagged ingredient food should not be in end results
							{Name: "Butter", Description: "That Lard"},
						},
					},
					{
						// Test of flagged ingredient category ie no foods in category are to be saved
						Name: "planet eats (cold)",
						Items: []models.Item{
							{Name: "Turkey Breast", Description: "this one didn't get pardoned"},
							{Name: "Thinly sliced ham", Description: "Invisible from the side"},
						},
					},
				},
			},
		},
		Closed: false,
	}
	mockResponseBody, err := json.Marshal(mockResponse)
	require.NoError(t, err, "Error marshalling mock response: %v", err)

	// Create a mock server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		query := r.URL.Query()

		fmt.Printf("Mock server received request: Path=%s, Query=%v\n", path, query)

		// Match the expected endpoint pattern
		if strings.HasPrefix(path, "/v1/location/5b33ae291178e909d807593d/periods/66e1fc2de45d43074be3a0e5") &&
			query.Get("platform") == "0" && query.Get("date") != "" {
			// Serve the mock response
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write(mockResponseBody)
		} else {
			// Return 404 for unmatched routes
			http.NotFound(w, r)
		}
	}))
	defer mockServer.Close()

	testConfig := scraper.ScrapeConfig{
		BaseURL: mockServer.URL + "/v1",
		Locations: []models.Location{
			{
				Name: "Allison",
				Hash: "5b33ae291178e909d807593d",
				Services: []models.Service{
					{TimeOfDay: "Breakfast", Hash: "66e1fc2de45d43074be3a0e5"},
				},
			},
		},
	}

	// Set up the scraper with the mock server URL
	diningHallScraper := &scraper.DiningHallScraper{
		Client: mockServer.Client(),
		Config: testConfig,
	}

	// Call the ScrapeAndSaveFood method and check results
	dailyItems, allDataItems, _, err := diningHallScraper.ScrapeFood("2024-12-16")
	require.NoError(t, err, "Error in ScrapeAndSaveFood: %v", err)

	// Check that the correct data was returned
	assert.Len(t, dailyItems, 1, "Expected 1 daily item, got %d", len(dailyItems))

	assert.Equal(t, "Pancakes", dailyItems[0].Name, "Expected daily item name to be 'Pancakes', got %s", dailyItems[0].Name)

	assert.Equal(t, "Delicious pancakes", dailyItems[0].Description, "Expected daily item description to be 'Delicious pancakes', got %s", dailyItems[0].Description)

	assert.Len(t, allDataItems, 1, "Expected 1 all data item, got %d", len(allDataItems))

	assert.Equal(t, "Pancakes", allDataItems[0].Name, "Expected all data item name to be 'Pancakes', got %s", allDataItems[0].Name)
}

func TestScrapeOperationHours(t *testing.T) {
	// Define a mock HTTP response
	mockResponse := models.OperationHoursResponseJSON{
		Locations: []models.LocationOperationInfoJSON{
			{
				Name: "Allison Dining Commons",
				Week: []models.DayOperationInfoJSON{
					{
						Day:    0,
						Date:   "2024-12-08",
						Status: "open",
						Hours: []models.HourOperationInfoJSON{
							{Start_hour: 7, Start_minutes: 0, End_hour: 20, End_minutes: 0},
						},
						Has_special_hours: false,
						Closed:            false,
					},
					{
						Day:    1,
						Date:   "2024-12-09",
						Status: "open",
						Hours: []models.HourOperationInfoJSON{
							{Start_hour: 7, Start_minutes: 0, End_hour: 20, End_minutes: 0},
						},
						Has_special_hours: false,
						Closed:            false,
					},
					{
						Day:    2,
						Date:   "2024-12-10",
						Status: "open",
						Hours: []models.HourOperationInfoJSON{
							{Start_hour: 7, Start_minutes: 0, End_hour: 20, End_minutes: 0},
						},
						Has_special_hours: false,
						Closed:            false,
					},
					{
						Day:    3,
						Date:   "2024-12-11",
						Status: "open",
						Hours: []models.HourOperationInfoJSON{
							{Start_hour: 7, Start_minutes: 0, End_hour: 20, End_minutes: 0},
						},
						Has_special_hours: false,
						Closed:            false,
					},
					{
						Day:    4,
						Date:   "2024-12-12",
						Status: "open",
						Hours: []models.HourOperationInfoJSON{
							{Start_hour: 7, Start_minutes: 0, End_hour: 20, End_minutes: 0},
						},
						Has_special_hours: false,
						Closed:            false,
					},
					{
						Day:    5,
						Date:   "2024-12-13",
						Status: "open",
						Hours: []models.HourOperationInfoJSON{
							{Start_hour: 7, Start_minutes: 0, End_hour: 20, End_minutes: 0},
						},
						Has_special_hours: false,
						Closed:            false,
					},
					{
						Day:    6,
						Date:   "2024-12-14",
						Status: "closed",
						Hours: []models.HourOperationInfoJSON{
							{Start_hour: 7, Start_minutes: 0, End_hour: 20, End_minutes: 0},
						},
						Has_special_hours: false,
						Closed:            true,
					},
				},
			},
		},
	}

	mockResponseBody, err := json.Marshal(mockResponse)
	require.NoError(t, err, "Error marshalling mock response: %v", err)

	// Create a mock server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		query := r.URL.Query()

		fmt.Printf("Mock server received request: Path=%s, Query=%v\n", path, query)

		// Match the expected endpoint pattern
		if strings.HasPrefix(path, "/v1/locations/weekly_schedule") &&
			query.Get("site_id") == "5acea5d8f3eeb60b08c5a50d" && query.Get("date") != "" {
			// Serve the mock response
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write(mockResponseBody)
		} else {
			// Return 404 for unmatched routes
			http.NotFound(w, r)
		}
	}))
	defer mockServer.Close()

	testConfig := scraper.ScrapeConfig{
		BaseURL: mockServer.URL + "/v1",
		SiteID:  "5acea5d8f3eeb60b08c5a50d",
	}

	// Set up the scraper with the mock server URL
	diningHallScraper := &scraper.DiningHallScraper{
		Client: mockServer.Client(),
		Config: testConfig,
	}

	// Call the ScrapeAndSaveFood method and check results
	locationOperationHours, err := diningHallScraper.ScrapeOperationHours("2024-12-08T06:00:00.000Z")
	require.NoError(t, err, "Error in ScrapeAndSaveFood: %v", err)

	assert.Len(t, locationOperationHours, 1, "Expected 1 location operation, got %d", len(locationOperationHours))

	assert.Equal(
		t,
		"Allison Dining Commons",
		locationOperationHours[0].Name,
		"Expected location operation name to be 'Allison Dining Commons', got %s",
		locationOperationHours[0].Name,
	)

	assert.Equal(t, 7, len(locationOperationHours[0].Week), "Expected 7 days of operation, got %d", len(locationOperationHours[0].Week))
}
