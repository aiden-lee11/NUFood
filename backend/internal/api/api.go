package api

import (
	"backend/internal/db"
	"backend/internal/models"
	"backend/internal/scraper"
	"backend/internal/twilio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

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

// ScrapeUpdateWeekly scrapes the weekly items and updates the database.
//
// This handler expects no request body and no special authorization.
// It responds with an HTTP status code indicating the result of the operation.
//
// Expected Authorization:
//   - No special authorization required.
func ScrapeUpdateWeekly(w http.ResponseWriter, r *http.Request) {
	scraper := &scraper.DiningHallScraper{
		Client: scraper.NewClient(),
		Config: scraper.DefaultConfig,
	}

	const MAX_RETRIES = 10

	var dItems []models.DailyItem
	var aItems []models.AllDataItem
	var err error

	for i := 0; i < MAX_RETRIES; i++ {
		fmt.Printf("trying scrape for the %d time\n", i)
		advancedDay := time.Now().AddDate(0, 0, 3).Format("2006-01-02")
		dItems, aItems, _, err = scraper.ScrapeFood(advancedDay)
		if err == nil {
			fmt.Printf("successful scrape on the %d time", i)
			err = nil
			break
		}
	}

	if err != nil {
		http.Error(w, "Error scraping and saving: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if dItems == nil {
		http.Error(w, "Error scraping and saving: nil dItems", http.StatusInternalServerError)
		return
	}

	if err := db.UpdateWeeklyItems(dItems); err != nil {
		http.Error(w, "Error updating weekly items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := db.InsertAllDataItems(aItems); err != nil {
		http.Error(w, "Error inserting all data items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return success code
	w.WriteHeader(http.StatusOK)
}

// ScrapeWeeklyItemsHandler scrapes daily dining hall items for +- 3 days from current day
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
func ScrapeWeeklyItemsHandler(w http.ResponseWriter, r *http.Request) {
	scraper := &scraper.DiningHallScraper{
		Client: scraper.NewClient(),
		Config: scraper.DefaultConfig,
	}

	const MAX_RETRIES = 10
	var weeklyItems []models.WeeklyItem
	var totalAllItems []models.AllDataItem

	today := time.Now()
	for scrapeInd := -3; scrapeInd <= 3; scrapeInd++ {
		scrapeDate := today.AddDate(0, 0, scrapeInd).Format("2006-01-02")

		var dItems []models.DailyItem
		var aItems []models.AllDataItem
		var err error

		for tryInd := 0; tryInd < MAX_RETRIES; tryInd++ {
			fmt.Printf("trying scrape on date %s for the %d time\n", scrapeDate, tryInd)
			dItems, aItems, _, err = scraper.ScrapeFood(scrapeDate)
			if err == nil {
				fmt.Printf("successful scrape on the %d time", tryInd)
				err = nil
				break
			}
		}

		if err != nil {
			http.Error(w, "Error scraping and saving: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if dItems == nil {
			http.Error(w, "Error scraping and saving: nil dItems", http.StatusInternalServerError)
			return
		}

		for _, dItem := range dItems {
			weeklyItems = append(weeklyItems, models.WeeklyItem{DailyItem: dItem, DayIndex: scrapeInd})
		}

		totalAllItems = append(totalAllItems, aItems...)
	}

	// New valid data so delete old data
	err := db.DeleteWeeklyItems()

	if err != nil {
		http.Error(w, "Error clearing daily items before scrape: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := db.InsertWeeklyItems(weeklyItems); err != nil {
		http.Error(w, "Error inserting daily items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := db.InsertAllDataItems(totalAllItems); err != nil {
		http.Error(w, "Error inserting all data items: "+err.Error(), http.StatusInternalServerError)
		return
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

	const MAX_RETRIES = 10
	var locationOperatingTimes []models.LocationOperatingTimes
	var err error

	for i := 0; i < MAX_RETRIES; i++ {
		fmt.Printf("trying scrape locations for the %d time\n", i)
		locationOperatingTimes, err = scraper.ScrapeLocationOperatingTimes(formattedDate)
		if err == nil {
			fmt.Printf("successful scrape on the %d time", i)
			err = nil
			break
		}
	}
	if len(locationOperatingTimes) == 0 {
		http.Error(w, "Error scraping and saving: nil locationOperatingTimes", http.StatusInternalServerError)
		return
	}

	// New valid data so delete old data
	err = db.DeleteLocationOperatingTimes()

	if err != nil {
		http.Error(w, "Error clearing location operating hours before scrape: "+err.Error(), http.StatusInternalServerError)
		return
	}

	err = db.InsertLocationOperatingTimes(locationOperatingTimes)
	if err != nil {
		http.Error(w, "Error inserting locationOperatingTimes: "+err.Error(), http.StatusInternalServerError)
		return
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
	// Return success status without a body
	w.WriteHeader(http.StatusNoContent)
}

func SetUserMailing(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	var req map[string]interface{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Error decoding JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	mailing, ok := req["mailing"].(bool)

	if !ok {
		http.Error(w, "mailing field not found or not a boolean", http.StatusBadRequest)
		return
	}
	err := db.UpdateMailingStatus(userID, mailing)

	if err != nil {
		http.Error(w, "Error updating mail value for user preferences: "+err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Println("Successful mailing update")
	w.WriteHeader(http.StatusNoContent)
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

	// Fetch data that doesn't depend on `dailyItems`
	allItems, err := db.GetAllDataItems()
	if err != nil {
		http.Error(w, "Error fetching all items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch weekly items (may not have nutrients depending on how GetAllWeeklyItems is implemented)
	weeklyItems, err := db.GetAllWeeklyItems()
	if err != nil {
		http.Error(w, "Error fetching weeklyItems items: "+err.Error(), http.StatusInternalServerError)
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

	mailing, err := db.GetUserMailing(userID)
	if err != nil {
		http.Error(w, "Error fetching user mailing: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch nutrition goals
	nutritionGoals, err := db.GetNutritionGoals(userID)
	if err != nil && err != db.NoUserGoalsInDB {
		http.Error(w, "Error fetching nutrition goals: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// If no goals are found, use default values
	if err == db.NoUserGoalsInDB {
		nutritionGoals = models.NutritionGoals{
			Calories: 2000,
			Protein:  50,
			Carbs:    275,
			Fat:      78,
		}
	}

	combinedData := map[string]interface{}{
		"allItems":               allItems,
		"weeklyItems":            weeklyItems,
		"locationOperatingTimes": locationOperatingTimes,
		"userPreferences":        userPreferences,
		"mailing":                mailing,
		"nutritionGoals":         nutritionGoals,
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the combined result as JSON
	if err := json.NewEncoder(w).Encode(combinedData); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
		return
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
		return
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
	// Fetch all data items (names only for filter)
	allItems, err := db.GetAllDataItems()
	if err != nil {
		http.Error(w, "Error fetching all items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch weekly items (may not have nutrients)
	weeklyItems, err := db.GetAllWeeklyItems()
	if err != nil {
		http.Error(w, "Error fetching weeklyItems items: "+err.Error(), http.StatusInternalServerError)
		return
	}

	locationOperatingTimes, err := db.GetLocationOperatingTimes()
	if err != nil {
		http.Error(w, "Error fetching location operations: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Default nutrition goals for non-authenticated users
	defaultNutritionGoals := models.NutritionGoals{
		Calories: 2000,
		Protein:  50,
		Carbs:    275,
		Fat:      78,
	}

	// Combine all data into a single JSON structure
	combinedData := map[string]interface{}{
		"allItems":               allItems,
		"weeklyItems":            weeklyItems,
		"locationOperatingTimes": locationOperatingTimes,
		"nutritionGoals":         defaultNutritionGoals,
	}

	// Set the response header to indicate JSON content
	w.Header().Set("Content-Type", "application/json")

	// Return the combined result as JSON
	if err := json.NewEncoder(w).Encode(combinedData); err != nil {
		http.Error(w, "Error encoding JSON response: "+err.Error(), http.StatusInternalServerError)
		return
	}
}

func SendOutMailing(w http.ResponseWriter, r *http.Request) {
	err := twilio.SendEmails()

	if err != nil {
		http.Error(w, "Error sending out emails: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func HandleUnsubscribe(w http.ResponseWriter, r *http.Request) {
	// Get user ID and token from query parameters
	userID := r.URL.Query().Get("user")
	token := r.URL.Query().Get("token")

	// Validate token
	expectedToken, err := twilio.GenerateUnsubscribeToken(userID)
	if err != nil || token != expectedToken {
		fmt.Printf("token: %v\n", token)
		fmt.Printf("expectedToken: %v\n", expectedToken)
		http.Error(w, "Invalid unsubscribe link", http.StatusBadRequest)
		return
	}

	// Update database to set mailing=false for this user
	err = db.UpdateMailingStatus(userID, false)
	if err != nil {
		log.Printf("Error unsubscribing user %s: %v", userID, err)
		http.Error(w, "Failed to unsubscribe", http.StatusInternalServerError)
		return
	}

	// Show success page
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`
		<html>
		<head>
			<title>Unsubscribed</title>
			<style>
				body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
				.success { color: green; }
			</style>
		</head>
		<body>
			<h1>Unsubscribed Successfully</h1>
			<p class="success">You have been removed from our mailing list.</p>
			<p>You can always resubscribe by updating your preferences in your account settings.</p>
		</body>
		</html>
	`))
}

// SaveNutritionGoalsHandler handles requests to save a user's nutrition goals.
//
// This handler expects a JSON request body containing nutrition goals and requires user authentication.
// It responds with an HTTP status code indicating the result of the operation.
//
// Expected Authorization:
//   - A valid Firebase ID token in the Authorization header.
//
// Request Body:
//   - JSON object with calories, protein, carbs, and fat.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func SaveNutritionGoalsHandler(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by AuthMiddleware)
	userID := r.Context().Value("userID").(string)

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Parse the JSON request
	var goals models.NutritionGoals
	if err := json.Unmarshal(body, &goals); err != nil {
		http.Error(w, "Error parsing request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Save the nutrition goals
	if err := db.SaveNutritionGoals(userID, goals); err != nil {
		http.Error(w, "Error saving nutrition goals: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return success code
	w.WriteHeader(http.StatusOK)
}

// GetNutritionGoalsHandler handles requests to retrieve a user's nutrition goals.
//
// This handler requires user authentication and responds with a JSON object containing the user's
// nutrition goals or an error status code.
//
// Expected Authorization:
//   - A valid Firebase ID token in the Authorization header.
//
// Parameters:
//   - w: The HTTP response writer.
//   - r: The HTTP request.
func GetNutritionGoalsHandler(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by AuthMiddleware)
	userID := r.Context().Value("userID").(string)

	// Get the nutrition goals
	goals, err := db.GetNutritionGoals(userID)
	if err != nil {
		if err == db.NoUserGoalsInDB {
			// Return default values if no goals are found
			goals = models.NutritionGoals{
				Calories: 2000,
				Protein:  50,
				Carbs:    275,
				Fat:      78,
			}
		} else {
			http.Error(w, "Error retrieving nutrition goals: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Set content type header
	w.Header().Set("Content-Type", "application/json")

	// Encode goals as JSON and send
	if err := json.NewEncoder(w).Encode(goals); err != nil {
		http.Error(w, "Error encoding response: "+err.Error(), http.StatusInternalServerError)
		return
	}
}
