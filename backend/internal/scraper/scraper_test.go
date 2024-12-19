package scraper_test

import (
	"backend/internal/models"
	"backend/internal/scraper"
	"encoding/json"
	"fmt"
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
						Name: "Breakfast",
						Items: []models.DailyItem{
							{Name: "Pancakes", Description: "Delicious pancakes"},
						},
					},
				},
			},
		},
	}
	mockResponseBody, err := json.Marshal(mockResponse)
	if err != nil {
		t.Fatalf("Error marshalling mock response: %v", err)
	}

	// Create a mock server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		query := r.URL.Query()

		fmt.Printf("Mock server received request: Path=%s, Query=%v\n", path, query)

		// Match the expected endpoint pattern
		if strings.HasPrefix(path, "/5b33ae291178e909d807593d/periods/66e1fc2de45d43074be3a0e5") &&
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
		BaseURL: mockServer.URL,
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
	dailyItems, allDataItems, err := diningHallScraper.ScrapeFood("2024-12-16")
	if err != nil {
		t.Fatalf("Error in ScrapeAndSaveFood: %v", err)
	}

	// Check that the correct data was returned
	if len(dailyItems) != 1 {
		t.Fatalf("Expected 1 daily item, got %d", len(dailyItems))
	}

	if dailyItems[0].Name != "Pancakes" {
		t.Fatalf("Expected daily item name to be 'Pancakes', got %s", dailyItems[0].Name)
	}

	if dailyItems[0].Description != "Delicious pancakes" {
		t.Fatalf("Expected daily item description to be 'Delicious pancakes', got %s", dailyItems[0].Description)
	}

	if len(allDataItems) != 1 {
		t.Fatalf("Expected 1 all data item, got %d", len(allDataItems))
	}

	if allDataItems[0].Name != "Pancakes" {
		t.Fatalf("Expected all data item name to be 'Pancakes', got %s", allDataItems[0].Name)
	}

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
	if err != nil {
		t.Fatalf("Error marshalling mock response: %v", err)
	}

	// Create a mock server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		query := r.URL.Query()

		fmt.Printf("Mock server received request: Path=%s, Query=%v\n", path, query)

		// Match the expected endpoint pattern
		if strings.HasPrefix(path, "/weekly_schedule") &&
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
		BaseURL: mockServer.URL,
		SiteID:  "5acea5d8f3eeb60b08c5a50d",
	}

	// Set up the scraper with the mock server URL
	diningHallScraper := &scraper.DiningHallScraper{
		Client: mockServer.Client(),
		Config: testConfig,
	}

	// Call the ScrapeAndSaveFood method and check results
	locationOperationHours, err := diningHallScraper.ScrapeOperationHours("2024-12-08T06:00:00.000Z")
	if err != nil {
		t.Fatalf("Error in ScrapeAndSaveFood: %v", err)
	}

	// Check that the correct data was returned
	if len(locationOperationHours) != 1 {
		t.Fatalf("Expected 1 location operation, got %d", len(locationOperationHours))
	}

	if locationOperationHours[0].Name != "Allison Dining Commons" {
		t.Fatalf("Expected location operation name to be 'Allison Dining Commons', got %s", locationOperationHours[0].Name)
	}

	if len(locationOperationHours[0].Week) != 7 {
		t.Fatalf("Expected 7 days of operation, got %d", len(locationOperationHours[0].Week))
	}
}
