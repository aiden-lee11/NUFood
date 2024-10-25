package scraper

import (
	"backend/internal/db"
	"encoding/json"
	"fmt"
	"github.com/gocolly/colly"
	"log"
	"net/http"
	"time"
)

// TODO add google calendar functionality so it scrapes the following days menu and then adds possible favorites and their locations and times to a google calendar

type DailyItem struct {
	Name        string
	Description string `json:"desc"`
	Date        string
	Location    string
}

type Location struct {
	Name       string
	Hash       string
	Services   []Service
	DailyItems []DailyItem
}

type Period struct {
	Name       string     `json:"name"`
	Categories []Category `json:"categories"`
	ID         string     `json:"id"`
}

type Category struct {
	Items []DailyItem `json:"items"`
	Name  string      `json:"name"`
}

type Menu struct {
	Periods Period
	Date    string `json:"date"`
}

type Service struct {
	TimeOfDay string
	Hash      string
}

type Response struct {
	Menu Menu `json:"menu"`
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
	// Create an HTTP client with a 30-second timeout
	client := &http.Client{
		Timeout: 30 * time.Second, // Set timeout to 30 seconds
	}

	// Set the HTTP client with timeout to the collector

	for _, location := range locations {
		for _, service := range location.Services {
			c := colly.NewCollector()
			c.WithTransport(client.Transport)

			locationName := location.Name

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

				err = postItemsToAllandDaily(jsonResponse, service, locName, rescrapeDaily)
				if err != nil {
					log.Printf("Error posting items for %s: %v", locName, err)
				}

			})

			c.OnError(func(r *colly.Response, err error) {
				log.Printf("Error for %s: %v", location.Name, err)
			})

			url := baseURL + location.Hash + "/periods/" + service.Hash + "?platform=0&date=" + date
			if err := c.Visit(url); err != nil {
				log.Printf("Failed to visit URL %s: %v", url, err)
				return err // Return the error to the caller
			}
		}
	}

	return nil
}

func postItemsToAllandDaily(jsonResponse Response, service Service, location string, rescrapeDaily bool) error {
	categories := jsonResponse.Menu.Periods.Categories

	date := jsonResponse.Menu.Date

	nonIngredientCategories := map[string]bool{
		"Comfort":                        true,
		"Comfort 1":                      true,
		"Comfort 2":                      true,
		"Grill - Available Upon Request": true,
		"Bakery-Dessert":                 true,
		"500 Degrees":                    true,
		"500 Degrees 1":                  true,
		"Soup":                           true,
		"Rice Cooker":                    true,
		"Kitchen Entree":                 true,
		"Kitchen Sides":                  true,
		"Flame":                          true,
		"Kosher":                         true,
		"Pure Eats":                      true,
		"Pure Eat 1":                     true,
		"Pure Eat 2":                     true,
	}

	ingredients := map[string]bool{
		"Shredded Cheddar Cheese":   true,
		"Crushed Red Pepper":        true,
		"Grated Parmesan Cheese":    true,
		"Lettuce Leaf":              true,
		"Sliced Red Onion":          true,
		"Sliced Dill Pickles":       true,
		"American Cheese Slice":     true,
		"Whole Wheat Hamburger Bun": true,
		"White Hamburger Bun":       true,
		"Hamburger Patty":           true,
		"Turkey Burger (No Bun)":    true,
	}

	for _, category := range categories {
		// Skip categories that are not food items
		if !nonIngredientCategories[category.Name] {
			continue
		}

		for _, item := range category.Items {
			// Skip items that are ingredients
			if ingredients[item.Name] {
				continue
			}

			itemName := db.AllDataItem{item.Name}
			err := db.InsertAllDataItem(itemName)
			if err != nil {
				log.Printf("Error saving item %s: %v", item.Name, err)
			}

			if !rescrapeDaily {
				fmt.Println("Not rescraping daily items")
				continue
			}

			fmt.Println("Rescraping daily items")
			menuItem := db.DailyItem{item.Name, item.Description, date, location, service.TimeOfDay}
			err = db.InsertDailyItem(menuItem)
			if err != nil {
				log.Printf("Error saving item %s: %v", item.Name, err)
			}

		}
	}

	return nil
}
