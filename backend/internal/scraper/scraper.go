package scraper

import (
	"backend/internal/db"
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"github.com/gocolly/colly"
	"log"
	"net/http"
	"strings"
)

type DiningHallScraper struct {
	Client *http.Client
	Config ScrapeConfig
}

type ScrapeConfig struct {
	Locations []models.Location
	BaseURL   string
}

var DefaultConfig = ScrapeConfig{
	Locations: []models.Location{
		{
			Name: "Allison",
			Hash: "5b33ae291178e909d807593d",
			Services: []models.Service{
				{TimeOfDay: "Breakfast", Hash: "66e1fc2de45d43074be3a0e5"},
				{TimeOfDay: "Lunch", Hash: "66e1fc2de45d43074be3a0fb"},
				{TimeOfDay: "Dinner", Hash: "66e1fc2de45d43074be3a111"},
			},
		},
		{
			Name: "Sargent",
			Hash: "5b33ae291178e909d807593e",
			Services: []models.Service{
				{TimeOfDay: "Breakfast", Hash: "66e97bac351d530685467360"},
				{TimeOfDay: "Lunch", Hash: "66e97bac351d53068546737e"},
				{TimeOfDay: "Dinner", Hash: "66e97bac351d53068546736f"},
			},
		},
		{
			Name: "Plex West",
			Hash: "5bae7de3f3eeb60c7d3854ba",
			Services: []models.Service{
				{TimeOfDay: "Breakfast", Hash: "66e99466351d5306ad498440"},
				{TimeOfDay: "Lunch", Hash: "66e99466351d5306ad498450"},
				{TimeOfDay: "Dinner", Hash: "66e99466351d5306ad49845b"},
			},
		},
		{
			Name: "Plex East",
			Hash: "5bae7ee9f3eeb60cb4f8f3af",
			Services: []models.Service{
				{TimeOfDay: "Lunch", Hash: "66e99466351d5306ad498467"},
				{TimeOfDay: "Dinner", Hash: "66e99466351d5306ad498461"},
			},
		},
		{
			Name: "Elder",
			Hash: "5d113c924198d409c34fdf5c",
			Services: []models.Service{
				{TimeOfDay: "Breakfast", Hash: "66e43426c625af07233bfef2"},
				{TimeOfDay: "Lunch", Hash: "66e43426c625af07233bff01"},
				{TimeOfDay: "Dinner", Hash: "66e85380351d5306adcbcbcd"},
			},
		},
	},
	BaseURL: "https://api.dineoncampus.com/v1/location/",
}

func (d *DiningHallScraper) ScrapeAndSaveFood(date string) error {

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

	// Maximum retries for failed visits
	const maxRetries = 3

	for _, location := range d.Config.Locations {
		for _, service := range location.Services {
			c := colly.NewCollector()
			c.WithTransport(d.Client.Transport)

			locationName := location.Name
			url := d.Config.BaseURL + location.Hash + "/periods/" + service.Hash + "?platform=0&date=" + date

			err := RetryRequest(url, maxRetries, func() error {
				return visitWithRetries(c, url, locationName, service.TimeOfDay, rescrapeDaily)
			})

			if err != nil {
				log.Printf("All retries failed for URL: %s", url)
			}
		}
	}

	fmt.Println("Scraping and saving successful")
	return nil
}

func visitWithRetries(c *colly.Collector, url, locationName, timeOfDay string, rescrapeDaily bool) error {
	c.OnRequest(func(r *colly.Request) {
		r.Ctx.Put("locationName", locationName)
	})

	c.OnResponse(func(r *colly.Response) {
		locName := r.Ctx.Get("locationName")
		var jsonResponse models.Response
		err := json.Unmarshal(r.Body, &jsonResponse)
		if err != nil {
			log.Printf("Error unmarshalling JSON for %s: %v", locName, err)
			return
		}

		menu := jsonResponse.Menu

		err = postItemsToAllandDaily(menu, locName, timeOfDay, rescrapeDaily)
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

func postItemsToAllandDaily(menu models.Menu, location, timeOfDay string, rescrapeDaily bool) error {
	categories := menu.Periods.Categories
	date := menu.Date

	if !rescrapeDaily {
		fmt.Println("Not rescraping daily items")
	} else {
		fmt.Println("Rescraping daily items")
	}

	for _, category := range categories {
		cleanedCategory := strings.ToLower(strings.TrimSpace(category.Name))
		if contains(IngredientCategories, cleanedCategory) {
			fmt.Println("Skipping category", cleanedCategory)
			continue
		}

		station_name := category.Name

		for _, item := range category.Items {
			cleanedItem := strings.ToLower(strings.TrimSpace(item.Name))

			if contains(Ingredients, cleanedItem) {
				continue
			}

			itemName := db.AllDataItem{Name: item.Name}
			err := db.InsertAllDataItem(itemName)
			if err != nil {
				log.Printf("Error saving item %s: %v", item.Name, err)
			}

			if !rescrapeDaily {
				continue
			}

			menuItem := db.DailyItem{
				Name:        item.Name,
				Description: item.Description,
				Date:        date,
				Location:    location,
				StationName: station_name,
				TimeOfDay:   timeOfDay,
			}

			// fmt.Printf("Inserting item %s for %s with station %s on %s\n", item.Name, station_name, location, date)
			err = db.InsertDailyItem(menuItem)
			if err != nil {
				log.Printf("Error saving item %s: %v", item.Name, err)
			}
		}
	}

	return nil
}
