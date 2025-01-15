package api

import (
	"backend/internal/db"
	"backend/internal/models"
	"backend/internal/scraper"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// DeleteDailyItems deletes all daily items from the database.
//
// This handler expects no request body and no special authorization.
// It responds with an HTTP status code indicating the result of the operation.
//
// Expected Authorization:
//   - No special authorization required.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func DeleteDailyItems(w http.ResponseWriter, r *http.Request) {
	err := db.DeleteDailyItems()
	if err != nil {
		http.Error(w, "Error deleting daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return success code
	w.WriteHeader(http.StatusOK)
}

// DeleteLocationOperatingTimes deletes all location operating times from the database.
//
// This handler expects no request body and no special authorization.
// It responds with an HTTP status code indicating the result of the operation.
//
// Expected Authorization:
//   - No special authorization required.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func DeleteLocationOperatingTimes(w http.ResponseWriter, r *http.Request) {
	err := db.DeleteLocationOperatingTimes()
	if err != nil {
		http.Error(w, "Error deleting location operations: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return success code
	w.WriteHeader(http.StatusOK)
}

// ScrapeDailyItemsHandler scrapes daily dining hall items and updates the database.
//
// This handler expects no request body but requires no authorization for the request.
// It responds with an HTTP status code indicating the result of the scraping operation.
//
// Expected Authorization:
//   - No special authorization required.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func ScrapeDailyItemsHandler(w http.ResponseWriter, r *http.Request) {
	scraper := &scraper.DiningHallScraper{
		Client: scraper.NewClient(),
		Config: scraper.DefaultConfig,
	}

	const MAX_RETRIES = 3

	var dItems []models.DailyItem
	var aItems []models.AllDataItem
	var allClosed bool
	var err error

	for i := 0; i < MAX_RETRIES; i++ {
		fmt.Printf("trying scrape for the %d time", i)
		dItems, aItems, allClosed, err = scraper.ScrapeFood(time.Now().Format("2006-01-02"))
		if err == nil {
			fmt.Printf("successful scrape on the %d time", i)
			err = nil
			break
		}
	}

	if err != nil {
		http.Error(w, "Error scraping and saving: "+err.Error(), http.StatusInternalServerError)
	}

	if dItems == nil {
		http.Error(w, "Error scraping and saving: nil dItems", http.StatusInternalServerError)
	}

	// New valid data so delete old data
	err = db.DeleteDailyItems()

	if err != nil {
		http.Error(w, "Error clearing daily items before scrape: "+err.Error(), http.StatusInternalServerError)
	}

	if err := db.InsertDailyItems(dItems, allClosed); err != nil {
		http.Error(w, "Error inserting daily items: "+err.Error(), http.StatusInternalServerError)
	}

	if err := db.InsertAllDataItems(aItems, allClosed); err != nil {
		http.Error(w, "Error inserting all data items: "+err.Error(), http.StatusInternalServerError)
	}

	// Return success code
	w.WriteHeader(http.StatusOK)
}

// ScrapeLocationOperatingTimesHandler scrapes dining hall location operating times and updates the database.
//
// This handler expects no request body but requires no authorization for the request.
// It responds with an HTTP status code indicating the result of the scraping operation.
//
// Expected Authorization:
//   - No special authorization required.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func ScrapeLocationOperatingTimesHandler(w http.ResponseWriter, r *http.Request) {
	scraper := &scraper.DiningHallScraper{
		Client: scraper.NewClient(),
		Config: scraper.DefaultConfig,
	}
	formattedDate := time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
	locationOperatingTimes, err := scraper.ScrapeLocationOperatingTimes(formattedDate)

	if locationOperatingTimes == nil {
		http.Error(w, "Error scraping and saving: nil locationOperatingTimes", http.StatusInternalServerError)
	}

	// New valid data so delete old data
	err = db.DeleteLocationOperatingTimes()

	if err != nil {
		http.Error(w, "Error clearing location operating hours before scrape: "+err.Error(), http.StatusInternalServerError)
	}

	err = db.InsertLocationOperatingTimes(locationOperatingTimes)
	if err != nil {
		http.Error(w, "Error inserting locationOperatingTimes: "+err.Error(), http.StatusInternalServerError)
	}

	if err != nil {
		http.Error(w, "Error scraping and saving: "+err.Error(), http.StatusInternalServerError)
	}

	// Return success code
	w.WriteHeader(http.StatusOK)
}

// SetUserPreferences saves user food preferences to the database.
//
// This handler expects a JSON body containing an array of `models.AllDataItem` objects representing the user's preferences.
// It requires an Authorization header containing a valid Firebase ID token.
//
// Expected Authorization:
//   - Authorization header containing a Firebase ID token (Bearer token).
//
// Expected Body:
//   - A JSON array of `models.AllDataItem` objects representing the user's food preferences.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func SetUserPreferences(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	// Read and parse the JSON body
	var favorites []models.AllDataItem

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Unmarshal (decode) the JSON into the Go slice
	if err := json.Unmarshal(body, &favorites); err != nil {

		http.Error(w, "Error parsing JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Call the SetUserPreferences function to set the user SetUserPreferences()
	err = db.SaveUserPreferences(userID, favorites)

	if err != nil {
		http.Error(w, "Error saving user preferences: "+err.Error(), http.StatusInternalServerError)
		return
	}

	availableFavorites, err := db.GetAvailableFavorites(userID)

	if err != nil {
		http.Error(w, "Error fetching favorites: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the result as JSON (example: return the received favorites back)
	if err := json.NewEncoder(w).Encode(availableFavorites); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
		return
	}
}

// GetAllDataHandler retrieves and combines all relevant dining hall data for the user.
//
// This handler expects an Authorization header containing a valid Firebase ID token. It combines daily items, location operating times, and user preferences into a single JSON response.
//
// Expected Authorization:
//   - Authorization header containing a Firebase ID token (Bearer token).
//
// Expected Body:
//   - No body is expected in this request.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func GetAllDataHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	// Fetch all daily items
	dailyItems, err := db.GetAllDailyItems()
	if err != nil {
		http.Error(w, "Error fetching daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch data that doesn't depend on `dailyItems`
	allItems, err := db.GetAllDataItems()
	if err != nil {
		http.Error(w, "Error fetching all items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	date, err := db.ReturnDateOfDailyItems()
	if err != nil {
		http.Error(w, "Error fetching date of daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	locationOperatingTimes, err := db.GetLocationOperatingTimes()
	if err != nil {
		http.Error(w, "Error fetching locationOperatingTimes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	userPreferences, err := db.GetUserPreferences(userID)
	if err == db.NoUserPreferencesInDB {
		userPreferences = []models.AllDataItem{}
	} else if err != nil {
		http.Error(w, "Error fetching user preferences: "+err.Error(), http.StatusInternalServerError)
		return
	}

	combinedData := map[string]interface{}{
		"date":                   date,
		"allItems":               allItems,
		"locationOperatingTimes": locationOperatingTimes,
		"userPreferences":        userPreferences,
	}

	// Data to only fetch if there exists dailyItems that day
	if len(dailyItems) > 0 {
		combinedData["dailyItems"] = dailyItems

		availableFavorites, err := db.GetAvailableFavorites(userID)
		if err == db.NoUserPreferencesInDB {
			availableFavorites = []models.DailyItem{}
		} else if err != nil {
			http.Error(w, "Error fetching favorites: "+err.Error(), http.StatusInternalServerError)
			return
		}
		combinedData["availableFavorites"] = availableFavorites
	} else {
		combinedData["allClosed"] = true
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the combined result as JSON
	if err := json.NewEncoder(w).Encode(combinedData); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
	}
}

// GetLocationOperatingTimesHandler retrieves dining hall location operating times from the database.
//
// This handler expects no request body and responds with location operating times in JSON format.
//
// Expected Authorization:
//   - No special authorization required.
//
// Expected Body:
//   - No body is expected in this request.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func GetLocationOperatingTimesHandler(w http.ResponseWriter, r *http.Request) {
	locationOperatingTimes, err := db.GetLocationOperatingTimes()
	if err != nil {
		http.Error(w, "Error fetching locationOperatingTimes : "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Combine all data into a single JSON structure
	labeledData := map[string]interface{}{
		"locationOperatingTimes": locationOperatingTimes,
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the combined result as JSON
	if err := json.NewEncoder(w).Encode(labeledData); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
	}
}

// GetGeneralDataHandler retrieves general dining hall data.
//
// This handler expects no request body but responds with general data, including daily items, location operating times, and other relevant information in JSON format.
//
// Expected Authorization:
//   - No special authorization required.
//
// Expected Body:
//   - No body is expected in this request.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func GetGeneralDataHandler(w http.ResponseWriter, r *http.Request) {
	// Fetch all daily items
	dailyItems, err := db.GetAllDailyItems()
	if err != nil {
		http.Error(w, "Error fetching daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch all data items
	allItems, err := db.GetAllDataItems()
	if err != nil {
		http.Error(w, "Error fetching daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	date, err := db.ReturnDateOfDailyItems()
	if err != nil {
		http.Error(w, "Error fetching date of daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	locationOperatingTimes, err := db.GetLocationOperatingTimes()
	if err != nil {
		http.Error(w, "Error fetching location operations: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Combine all data into a single JSON structure
	combinedData := map[string]interface{}{
		"date":                   date,
		"allItems":               allItems,
		"locationOperatingTimes": locationOperatingTimes,
	}

	if len(dailyItems) > 0 {
		combinedData["dailyItems"] = dailyItems
	} else {
		combinedData["allClosed"] = true
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the combined result as JSON
	if err := json.NewEncoder(w).Encode(combinedData); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
		return
	}
}
