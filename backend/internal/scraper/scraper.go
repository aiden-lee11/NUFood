package scraper

import (
	"backend/internal/db"
	"encoding/json"
	"fmt"
	"github.com/gocolly/colly"
	"log"
	"net/http"
	"strings"
	"time"
)

// Internal Structs
type Location struct {
	Name       string
	Hash       string
	Services   []Service
	DailyItems []DailyItem
}

type Service struct {
	TimeOfDay string
	Hash      string
}

// API Data
type Response struct {
	Menu Menu `json:"menu"`
	// Status string `json:"status"`
	// request_time float `json:"request_time"`
	// records int `json:"records"`
	// allergen_filter boolean `json:"allergen_filter"`
}

type Menu struct {
	// id int `json:"id"`
	// date string `json:"date"`
	// name string `json:"name"`
	// from_date string `json:"from_date"`
	// to_date string `json:"to_date"`
	Periods Periods
	Date    string `json:"date"`
}

type Periods struct {
	// name string `json:"name"`
	// id string `json:"id"`
	// sort_order int `json:"sort_order"`
	Categories []Category `json:"categories"`
}

type Category struct {
	// id string `json:"id"`
	Name string `json:"name"`
	// sort_order int `json:"sort_order"`
	Items []DailyItem `json:"items"`
}

type Item struct {
	// id string `json:"id"`
	// name string `json:"name"`
	// mrn int `json:"mrn"`
	// rev string `json:"rev"`
	// mrn_full string `json:"mrn_full"`
	Description string `json:"desc"`
	// webtrition_id string `json:"webtrition_id"`
	// sort_order int `json:"sort_order"`
	// portion string `json:"portion"`
	// qty string `json:"qty"`
	// ingredients string `json:"ingredients"`
	// nutrients []Nutrient `json:"nutrients"`
	// filters []Filter `json:"filters"`
}

type Nutrient struct {
	// id string `json:"id"`
	// name string `json:"name"`
	// value string `json:"value"`
	// uom string `json:"uom"`
	// value_numeric string `json:"value_numeric"`
}

type Filter struct {
	// id string `json:"id"`
	// name string `json:"name"`
	// type string `json:"type"`
	// icon boolean `json:"icon"`
	// remote_file_name string `json:"remote_file_name"`
	// sector_icon_id string `json:"sector_icon_id"`
	// custom_icon string `json:"custom_icon"`
}

// Item Struct for only data that I want to save
type DailyItem struct {
	// id string `json:"id"`
	// name string `json:"name"`
	// mrn int `json:"mrn"`
	// rev string `json:"rev"`
	// mrn_full string `json:"mrn_full"`
	Description string `json:"desc"`
	// webtrition_id string `json:"webtrition_id"`
	// sort_order int `json:"sort_order"`
	// portion string `json:"portion"`
	// qty string `json:"qty"`
	// ingredients string `json:"ingredients"`
	// nutrients []Nutrient `json:"nutrients"`

	Name     string
	Date     string
	Location string
}

func ScrapeAndSave(date string) error {
	locations := []Location{
		{Name: "Allison", Hash: "5b33ae291178e909d807593d", Services: []Service{
			{"Breakfast", "66e1fc2de45d43074be3a0e5"},
			{"Lunch", "66e1fc2de45d43074be3a0fb"},
			{"Dinner", "66e1fc2de45d43074be3a111"},
		}},
		{Name: "Sargent", Hash: "5b33ae291178e909d807593e", Services: []Service{
			{"Breakfast", "66e97bac351d530685467360"},
			{"Lunch", "66e97bac351d53068546737e"},
			{"Dinner", "66e97bac351d53068546736f"},
		}},
		{Name: "Plex West", Hash: "5bae7de3f3eeb60c7d3854ba", Services: []Service{
			{"Breakfast", "66e99466351d5306ad498440"},
			{"Lunch", "66e99466351d5306ad498450"},
			{"Dinner", "66e99466351d5306ad49845b"},
		}},
		{Name: "Plex East", Hash: "5bae7ee9f3eeb60cb4f8f3af", Services: []Service{
			{"Lunch", "66e99466351d5306ad498467"},
			{"Dinner", "66e99466351d5306ad498461"},
		}},
		{Name: "Elder", Hash: "5d113c924198d409c34fdf5c", Services: []Service{
			{"Breakfast", "66e43426c625af07233bfef2"},
			{"Lunch", "66e43426c625af07233bff01"},
			{"Dinner", "66e85380351d5306adcbcbcd"},
		}},
	}
	baseURL := "https://api.dineoncampus.com/v1/location/"

	// Check if we need to rescrape the daily items
	previousDate, err := db.ReturnDateOfDailyItems()
	if err != nil && err != db.NoItemsInDB {
		log.Printf("Error getting date of daily items: %v", err)
		return err
	}
	rescrapeDaily := date != previousDate
	if rescrapeDaily {
		db.DeleteDailyItems()
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Maximum retries for failed visits
	const maxRetries = 3

	for _, location := range locations {
		for _, service := range location.Services {
			c := colly.NewCollector()
			c.WithTransport(client.Transport)

			locationName := location.Name
			url := baseURL + location.Hash + "/periods/" + service.Hash + "?platform=0&date=" + date

			// Retry logic wrapped around the visit
			retryCount := 0
			for {
				log.Printf("Grabbing %s's %s time. For the %d time.", locationName, service.TimeOfDay, retryCount+1)
				err := visitWithRetries(c, url, locationName, service, rescrapeDaily)
				if err != nil {
					retryCount++
					if retryCount > maxRetries {
						log.Printf("Max retries exceeded for URL: %s", url)
						break
					}
					log.Printf("Retrying (%d/%d) for URL: %s", retryCount, maxRetries, url)
					continue
				}
				break // Exit loop if visit succeeds
			}
		}
	}

	fmt.Println("Scraping and saving successful")
	return nil
}

func visitWithRetries(c *colly.Collector, url, locationName string, service Service, rescrapeDaily bool) error {
	c.OnRequest(func(r *colly.Request) {
		r.Ctx.Put("locationName", locationName)
	})

	c.OnResponse(func(r *colly.Response) {
		locName := r.Ctx.Get("locationName")
		var jsonResponse Response
		err := json.Unmarshal(r.Body, &jsonResponse)
		if err != nil {
			log.Printf("Error unmarshalling JSON for %s: %v", locName, err)
			return
		}

		menu := jsonResponse.Menu

		err = postItemsToAllandDaily(menu, service, locName, rescrapeDaily)
		if err != nil {
			log.Printf("Error posting items for %s: %v", locName, err)
		}
	})

	c.OnError(func(r *colly.Response, err error) {
		log.Printf("Error for %s: %v", locationName, err)
	})

	err := c.Visit(url)
	if err != nil {
		log.Printf("Visit failed for URL %s: %v", url, err)
		return err
	}
	return nil
}

func postItemsToAllandDaily(menu Menu, service Service, location string, rescrapeDaily bool) error {
	categories := menu.Periods.Categories
	date := menu.Date

	ingredientCategories := []string{
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
	}

	ingredients := []string{
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
	if !rescrapeDaily {
		fmt.Println("Not rescraping daily items")
	} else {
		fmt.Println("Rescraping daily items")
	}

	for _, category := range categories {
		cleanedCategory := strings.ToLower(strings.TrimSpace(category.Name))
		if contains(ingredientCategories, cleanedCategory) {
			fmt.Println("Skipping category", cleanedCategory)
			continue
		}

		station_name := category.Name

		for _, item := range category.Items {
			cleanedItem := strings.ToLower(strings.TrimSpace(item.Name))

			if contains(ingredients, cleanedItem) {
				continue
			}

			itemName := db.AllDataItem{item.Name}
			err := db.InsertAllDataItem(itemName)
			if err != nil {
				log.Printf("Error saving item %s: %v", item.Name, err)
			}

			if !rescrapeDaily {
				continue
			}

			menuItem := db.DailyItem{item.Name, item.Description, date, location, station_name, service.TimeOfDay}
			// fmt.Printf("Inserting item %s for %s with station %s on %s\n", item.Name, station_name, location, date)
			err = db.InsertDailyItem(menuItem)
			if err != nil {
				log.Printf("Error saving item %s: %v", item.Name, err)
			}
		}
	}

	return nil
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
