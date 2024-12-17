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

func TestScrapeAndSaveFood(t *testing.T) {
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
