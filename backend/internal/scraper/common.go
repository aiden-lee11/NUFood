package scraper

import (
	"backend/internal/models"
	"fmt"
	"net/http"
	"time"
)

// Predefined ingredient-related categories and items used to filter dining data.
// Categories or items matching these lists are excluded from saving.
var (
	// IngredientCategories contains predefined parts of the dining halls
	// that contain only ingredients. If a category matches this list, we do not save it.
	IngredientCategories = []string{
		// Allison
		"pantry 1",
		"gluten free pantry",
		"beverage",
		"salad bar 1",
		"salad bar 2",
		"flame 1",
		"flame 2",
		// Sargent
		"planet eats (hot)",
		"planet eats (cold)",
		"planet eats toppings",
		"made to order deli",
		// Elder
		"deli",
		"salad bar",
		"my pantry",
	}

	// Ingredients lists the ingredients commonly used in the dining operations.
	// If an item matches this list, we do not save it.
	Ingredients = []string{
		"shredded cheddar cheese",
		"crushed red pepper",
		"grated parmesan cheese",
		"lettuce leaf",
		"sliced red onion",
		"sliced dill pickles",
		"american cheese slice",
		"hamburger patty",
		"turkey burger (no bun)",
		"egg whites",
		"butter",
		"light cream cheese",
		"2% greek plain yogurt",
		"low fat strawberry yogurt",
		"low fat vanilla yogurt",
		"diced onions",
		"chopped spinach",
		"chopped broccoli",
		"chopped green bell pepper",
		"sliced mushrooms",
		"chopped tomatoes",
		"diced bacon",
		"turkey sausage link",
		"diced smoked ham",
		"oats 'n honey granola",
		"raisins",
		"sunflower spread",
		"grape jelly",
		"sliced green onions",
		"dried oregano",
		"chopped romaine lettuce",
		"spring mix",
		"chopped cilantro",
		"fresh orange & fennel",
		"charred tomato and green bean",
		"cucumber",
		"tomato",
		"parsley",
		"kale",
		"butternut squash",
		"mixed melon",
		"roasted sweet potatoes",
		"zucchini",
		"cherry tomatoes",
		"mushrooms",
		"spinach",
		"broccoli",
		"green beans",
		"carrots",
		"okra",
		"bell peppers",
		"onions",
		"garlic",
		"fresh herbs",
		"lemons",
		"eggs",
		"crumbled feta cheese",
		"yogurt",
		"sour cream",
		"chopped bacon",
		"meatless black bean burger",
		"long grain wild rice blend",
		"steamed rice",
		"wild rice",
		"avoiding gluten barilla penne",
		"granola",
		"soy sauce",
		"everything bagel seasoning",
		"sesame seed mix",
		"pomodoro sauce",
		"salsa verde",
		"salsa rojas",
		"guacamole",
		"pico de gallo",
		"olive oil",
		"sriracha aquafaba aioli",
		"white hamburger bun",
	}
)

// RetryRequest attempts to execute a given callback function up to a specified number
// of retries if the function returns an error. Returns an error if all retries fail.
//
// Parameters:
//   - url: The URL associated with the request (used in the error message).
//   - retries: The maximum number of retries.
//   - callback: The function to execute, which should return an error if it fails.
//
// Returns:
//   - error: An error indicating the failure of all retries, if applicable.
func RetryRequest(url string, retries int, callback func() error) error {
	for i := 0; i < retries; i++ {
		err := callback()
		if err == nil {
			return nil
		}
	}
	return fmt.Errorf("all retries failed for URL: %s", url)
}

// contains checks if a given string exists within a slice of strings.
//
// Parameters:
//   - slice: The slice of strings to search.
//   - item: The string to find.
//
// Returns:
//   - bool: True if the string is found, false otherwise.
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// NewClient creates a new HTTP client with a predefined timeout.
//
// Returns:
//   - *http.Client: A pointer to the configured HTTP client.
func NewClient() *http.Client {
	return &http.Client{
		Timeout: time.Second * 30,
	}
}

// convertWeekOperationInfoJSON converts a slice of DailyOperatingInfo into a slice
// of DailyOperatingTimes.
//
// Parameters:
//   - week: A slice of DailyOperatingInfo containing operational data for each day.
//
// Returns:
//   - []models.DailyOperatingTimes: A slice of parsed daily operating times.
func convertWeekOperationInfoJSON(week []models.DailyOperatingInfo) []models.DailyOperatingTimes {
	var parsedWeek []models.DailyOperatingTimes
	for _, day := range week {
		parsedWeek = append(parsedWeek, convertDayOperationInfoJSON(day))
	}
	return parsedWeek
}

// convertDayOperationInfoJSON converts a single DailyOperatingInfo into DailyOperatingTimes.
//
// Parameters:
//   - day: A DailyOperatingInfo object containing operational data for a single day.
//
// Returns:
//   - models.DailyOperatingTimes: Parsed operating times for the day.
func convertDayOperationInfoJSON(day models.DailyOperatingInfo) models.DailyOperatingTimes {
	var hours []models.HourlyTimes
	for _, hour := range day.Hours {
		hours = append(hours, convertHourOperationInfoJSON(hour))
	}
	return models.DailyOperatingTimes{
		Day:    day.Day,
		Date:   day.Date,
		Status: day.Status,
		Hours:  hours,
	}
}

// convertHourOperationInfoJSON converts a single HourlyOperatingInfo into HourlyTimes.
//
// Parameters:
//   - hour: A HourlyOperatingInfo object containing operational data for a specific hour range.
//
// Returns:
//   - models.HourlyTimes: Parsed hourly times.
func convertHourOperationInfoJSON(hour models.HourlyOperatingInfo) models.HourlyTimes {
	return models.HourlyTimes{
		StartHour:    hour.StartHour,
		StartMinutes: hour.StartMinutes,
		EndHour:      hour.EndHour,
		EndMinutes:   hour.EndMinutes,
	}
}
