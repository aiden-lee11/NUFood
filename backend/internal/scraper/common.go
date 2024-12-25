package scraper

import (
	"backend/internal/models"
	"fmt"
	"net/http"
	"time"
)

var IngredientCategories = []string{
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

var Ingredients = []string{
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

func RetryRequest(url string, retries int, callback func() error) error {
	for i := 0; i < retries; i++ {
		err := callback()
		if err == nil {
			return nil
		}
	}
	return fmt.Errorf("all retries failed for URL: %s", url)
}

// contains checks if a string is present in a slice
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func NewClient() *http.Client {
	return &http.Client{
		Timeout: time.Second * 30,
	}
}

func convertWeekOperationInfoJSON(week []models.DailyOperatingInfo) []models.DailyOperatingTimes {
	var parsedWeek []models.DailyOperatingTimes
	for _, day := range week {
		parsedWeek = append(parsedWeek, convertDayOperationInfoJSON(day))
	}
	return parsedWeek
}

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

func convertHourOperationInfoJSON(hour models.HourlyOperatingInfo) models.HourlyTimes {
	return models.HourlyTimes{
		StartHour:    hour.StartHour,
		StartMinutes: hour.StartMinutes,
		EndHour:      hour.EndHour,
		EndMinutes:   hour.EndMinutes,
	}
}
