package api

import (
	"backend/internal/auth"
	"backend/internal/db"
	"backend/internal/scraper"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func setCorsHeaders(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "http://localhost:5173" || origin == "https://nu-food-finder.vercel.app" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func DeleteDailyItems(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	setCorsHeaders(w, r)

	// Handle preflight OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	err := db.DeleteDailyItems()
	if err != nil {
		http.Error(w, "Error deleting daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return success code
	w.WriteHeader(http.StatusOK)
}

func ScrapeDailyItemsHandler(w http.ResponseWriter, r *http.Request) {

	// Set CORS headers
	setCorsHeaders(w, r)

	fmt.Println("Scraping daily items")
	fmt.Println("This is an internal API endpoint")

	err := scraper.ScrapeAndSave(time.Now().Format("2006-01-02"))

	if err != nil {
		http.Error(w, "Error scraping and saving: "+err.Error(), http.StatusInternalServerError)
	}
	// Return success code
	w.WriteHeader(http.StatusOK)
}

func ScrapeHistoricalItemsHandler(w http.ResponseWriter, r *http.Request) {

	// Set CORS headers
	setCorsHeaders(w, r)

	fmt.Println("Scraping historical items")
	// Iterate over the past 10 days
	for i := 0; i < 20; i++ {
		// Subtract i days from the current time
		pastDay := time.Now().AddDate(0, 0, -i)
		// Format the date as YYYY-MM-DD
		formattedDate := pastDay.Format("2006-01-02")

		err := scraper.ScrapeAndSave(formattedDate)

		if err != nil {
			fmt.Println("Error scraping and saving: ", err)
			http.Error(w, "Error scraping and saving: "+err.Error(), http.StatusInternalServerError)
		}
	}

	// Return success code
	w.WriteHeader(http.StatusOK)
}

func SetUserPreferences(w http.ResponseWriter, r *http.Request) {

	// Set CORS headers
	setCorsHeaders(w, r)

	// Handle preflight OPTIONS request (browser sends an OPTIONS request before a GET/POST request to check for CORS)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Read and parse the JSON body
	var favorites []db.AllDataItem

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

	// Get userID from query parameters
	userID := r.URL.Query().Get("userID")

	if userID == "" {
		http.Error(w, "Missing userID", http.StatusBadRequest)
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

// Will take in a body that contains auth token, if not present return global data
// If present, additionally return user specific data
func GetAllDataHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	setCorsHeaders(w, r)

	// Handle preflight OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get Firebase ID token from header
	authHeader := r.Header.Get("Authorization")

	token, err := auth.VerifyIDToken(authHeader)
	if err != nil {
		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	// Extract user ID from token claims
	userID := token.UID
	if userID == "" {
		http.Error(w, "UserID not found in token", http.StatusBadRequest)
		return
	}

	// Fetch available favorites for the user
	availableFavorites, err := db.GetAvailableFavorites(userID)
	if err == db.NoUserPreferencesInDB {
		availableFavorites = []db.DailyItem{}
	} else if err != nil {
		http.Error(w, "Error fetching favorites: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch all daily items
	dailyItems, err := db.GetAllDailyItems()
	if err != nil {
		http.Error(w, "Error fetching daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch all daily items
	allItems, err := db.GetAllDataItems()
	if err != nil {
		http.Error(w, "Error fetching daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch user preferences
	userPreferences, err := db.GetUserPreferences(userID)
	if err == db.NoUserPreferencesInDB {
		userPreferences = []db.AllDataItem{}
	} else if err != nil {
		http.Error(w, "Error fetching user preferences: "+err.Error(), http.StatusInternalServerError)
		return
	}

	date, err := db.ReturnDateOfDailyItems()
	if err != nil {
		http.Error(w, "Error fetching date of daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Combine all data into a single JSON structure
	combinedData := map[string]interface{}{
		"availableFavorites": availableFavorites,
		"dailyItems":         dailyItems,
		"date":               date,
		"allItems":           allItems,
		"userPreferences":    userPreferences,
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the combined result as JSON
	if err := json.NewEncoder(w).Encode(combinedData); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
	}
}
