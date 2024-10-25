package api

import (
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

func GetAvailableFavoritesHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	setCorsHeaders(w, r)

	// Handle preflight OPTIONS request (browser sends an OPTIONS request before a GET/POST request to check for CORS)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get userID from query parameters
	userID := r.URL.Query().Get("userID")

	if userID == "" {
		http.Error(w, "Missing userID", http.StatusBadRequest)
		return
	}

	// Call the GetAvailableFavorites function to get favorites for the user
	favorites, err := db.GetAvailableFavorites(userID)

	if err != nil {
		if err == db.NoUserPreferencesInDB {
			// Return 404 if no favorites are found
			http.Error(w, "User not found", http.StatusNotFound)
		} else {
			// For other types of errors, return a 500
			fmt.Println("Error fetching favorites: ", err)
			http.Error(w, "Error fetching favorites: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	// If no favorites are found but no error that means that the user has favorites but they are not available today
	if len(favorites) == 0 {
		http.Error(w, "No favorites found", http.StatusNotFound)
		return
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the result as JSON
	if err := json.NewEncoder(w).Encode(favorites); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
	}
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
	fmt.Println("This is an internal API endpoint")
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

func UserPreferencesHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers (common for both methods)
	setCorsHeaders(w, r)

	// Handle preflight OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Switch based on the request method
	switch r.Method {
	case http.MethodGet:
		GetUserPreferences(w, r) // Call your GET handler
	case http.MethodPost:
		SetUserPreferences(w, r) // Call your POST handler
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func GetAllDataItemsHander(w http.ResponseWriter, r *http.Request) {

	// Set CORS headers
	setCorsHeaders(w, r)

	// Handle preflight OPTIONS request (browser sends an OPTIONS request before a GET/POST request to check for CORS)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Call the GetAvailableFavorites function to get favorites for the user
	data, err := db.GetAllDataItems()
	if err != nil {
		http.Error(w, "Error fetching favorites: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the result as JSON
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
	}
}

func GetAllDailyItemsHander(w http.ResponseWriter, r *http.Request) {

	// Set CORS headers
	setCorsHeaders(w, r)

	// Handle preflight OPTIONS request (browser sends an OPTIONS request before a GET/POST request to check for CORS)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Call the GetAvailableFavorites function to get favorites for the user
	data, err := db.GetAllDailyItems()
	if err != nil {
		http.Error(w, "Error fetching favorites: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the result as JSON
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
	}
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

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the result as JSON (example: return the received favorites back)
	if err := json.NewEncoder(w).Encode(favorites); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
		return
	}
}

func GetUserPreferences(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	setCorsHeaders(w, r)

	// Handle preflight OPTIONS request (browser sends an OPTIONS request before a GET/POST request to check for CORS)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get userID from query parameters
	userID := r.URL.Query().Get("userID")

	if userID == "" {
		http.Error(w, "Missing userID", http.StatusBadRequest)
		return
	}

	// Call the GetAvailableFavorites function to get favorites for the user
	userPreferences, err := db.GetUserPreferences(userID)
	if err != nil {
		http.Error(w, "Error fetching favorites: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the result as JSON
	if err := json.NewEncoder(w).Encode(userPreferences); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
	}
}
