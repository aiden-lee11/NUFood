package scraper

import (
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/gocolly/colly"
)

// DiningHallScraper represents a scraper for dining hall information.
type DiningHallScraper struct {
	Client *http.Client // HTTP client for making requests.
	Config ScrapeConfig // Configuration for scraping dining hall data.
}

// ScrapeConfig defines the configuration for scraping.
type ScrapeConfig struct {
	Locations []models.Location // List of dining hall locations to scrape.
	SiteID    string            // Site ID for the dining hall API.
	BaseURL   string            // Base URL for the dining hall API.
}

// Maximum retries for failed visits
const MAX_RETRIES = 5

var DefaultConfig = ScrapeConfig{
	Locations: []models.Location{
		{
			Name: "Allison",
			Hash: "5b33ae291178e909d807593d",
		},
		{
			Name: "Sargent",
			Hash: "5b33ae291178e909d807593e",
		},
		{
			Name: "Plex East",
			Hash: "5bae7de3f3eeb60c7d3854ba",
		},
		{
			Name: "Plex West",
			Hash: "5bae7ee9f3eeb60cb4f8f3af",
		},
		{
			Name: "Elder",
			Hash: "5d113c924198d409c34fdf5c",
		},
	},
	SiteID:  "5acea5d8f3eeb60b08c5a50d",
	BaseURL: "https://apiv4.dineoncampus.com",
}

// ScrapeFood scrapes daily menu items for a given date.
// It iterates through configured locations and services, making API calls to gather menu data.
//
// Parameters:
//   - date: The date for which to scrape food data (e.g., "2024-12-08").
//
// Returns:
//   - []models.DailyItem: A list of daily menu items.
//   - []models.AllDataItem: A list of all data items.
//   - bool: Indicates whether all locations are closed.
//   - error: An error, if any occurred during the scraping process.
func (d *DiningHallScraper) ScrapeFood(date string) ([]models.DailyItem, []models.AllDataItem, bool, error) {
	var dailyItems []models.DailyItem
	var allDataItems []models.AllDataItem
	allClosed := true

	for _, location := range d.Config.Locations {
		fmt.Printf("Scraping location %s\n", location.Name)
		d.setLocationServiceIds(&location, date)

		if len(location.Services) == 0 {
			fmt.Printf("Did not find any services for location %s, skipping scrape\n", location.Name)
			continue
		}

		for _, service := range location.Services {
			c := colly.NewCollector()
			c.WithTransport(d.Client.Transport)

			url := fmt.Sprintf("%s/locations/%s/menu?date=%s&period=%s", d.Config.BaseURL, location.Hash, date, service.ID)

			err := RetryRequest(url, MAX_RETRIES, func() error {
				dItems, aItems, closed, err := visitDiningHall(c, url, location.Name, service.TimeOfDay)
				if err != nil {
					return err
				}

				if !closed {
					allClosed = false
				}

				dailyItems = append(dailyItems, dItems...)
				allDataItems = append(allDataItems, aItems...)

				return nil
			})

			if err != nil {
				log.Printf("All retries failed for URL: %s", url)
				return nil, nil, allClosed, err
			}
		}
	}

	fmt.Println("Scraping successful")
	return dailyItems, allDataItems, allClosed, nil
}

func (d *DiningHallScraper) setLocationServiceIds(location *models.Location, date string) {
	// ex https://apiv4.dineoncampus.com/locations/5b33ae291178e909d807593e/periods/?date=2025-08-27
	hashesURL := fmt.Sprintf("%s/locations/%s/periods/?date=%s", d.Config.BaseURL, location.Hash, date)
	resp, err := http.Get(hashesURL)
	if err != nil {
		fmt.Println("error getting the hashes for ", location.Hash)
		return
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("error reading body for ", location.Hash)
		return
	}

	var locationServicesResp models.LocationServicesResponse
	err = json.Unmarshal(body, &locationServicesResp)
	if err != nil {
		fmt.Println("error unmarshalling body for ", location.Hash)
		return
	}

	location.Services = locationServicesResp.Services
}

// ScrapeLocationOperatingTimes scrapes operating times for dining hall locations on a given date.
//
// Parameters:
//   - date: The date for which to scrape operating times (e.g., "2024-12-08").
//
// Returns:
//   - []models.LocationOperatingTimes: A list of operating times for each location.
//   - error: An error, if any occurred during the scraping process.
func (d *DiningHallScraper) ScrapeLocationOperatingTimes(date string) ([]models.LocationOperatingTimes, error) {
	c := colly.NewCollector()
	c.WithTransport(d.Client.Transport)

	url := fmt.Sprintf("%s/locations/weekly_schedule/?site_id=%s&date=%s", d.Config.BaseURL, d.Config.SiteID, date)

	var locationOperatingTimesList []models.LocationOperatingTimes

	err := RetryRequest(url, MAX_RETRIES, func() error {
		locationOperationInfo, err := visitLocationOperatingTimes(c, url)
		if err != nil {
			return err
		}

		locationOperatingTimesList = append(locationOperatingTimesList, locationOperationInfo...)

		return nil
	})

	if err != nil {
		log.Printf("All retries failed for URL: %s", url)
		return nil, err
	}

	fmt.Println("Scraping and saving successful")
	return locationOperatingTimesList, nil
}

// visitLocationOperatingTimes visits the API endpoint to fetch operating times for a location.
//
// Parameters:
//   - c: A Colly collector for scraping.
//   - url: The URL to scrape.
//
// Returns:
//   - []models.LocationOperatingTimes: Parsed operating times for locations.
//   - error: An error, if any occurred during the scraping process.
func visitLocationOperatingTimes(c *colly.Collector, url string) ([]models.LocationOperatingTimes, error) {
	var locationOperatingTimesList []models.LocationOperatingTimes

	c.OnResponse(func(r *colly.Response) {
		var jsonResponse models.LocationOperationsResponse
		err := json.Unmarshal(r.Body, &jsonResponse)
		if err != nil {
			log.Printf("Error unmarshalling JSON for operation hours: %v", err)
			return
		}

		locations := jsonResponse.Locations

		locationOperatingTimesList, err = parseLocationOperatingTimes(locations)

		if err != nil {
			log.Printf("Error for operation hours: %v", err)
			return
		}
	})

	c.OnError(func(r *colly.Response, err error) {
		log.Printf("Error for operation hours: %v", err)
	})

	log.Printf("Visiting URL: %s", url)

	err := c.Visit(url)
	if err != nil {
		log.Printf("Visit failed for URL %s: %v", url, err)
		return nil, err
	}
	return locationOperatingTimesList, nil
}

// visitDiningHall visits the API endpoint to fetch menu data for a dining hall.
//
// Parameters:
//   - c: A Colly collector for scraping.
//   - url: The URL to scrape.
//   - locationName: The name of the dining hall location.
//   - timeOfDay: The service time (e.g., "Breakfast", "Lunch", "Dinner").
//
// Returns:
//   - []models.DailyItem: A list of daily menu items.
//   - []models.AllDataItem: A list of all data items.
//   - bool: Indicates whether the location is closed.
//   - error: An error, if any occurred during the scraping process.
func visitDiningHall(c *colly.Collector, url, locationName, timeOfDay string) ([]models.DailyItem, []models.AllDataItem, bool, error) {
	var dailyItems []models.DailyItem
	var allDataItems []models.AllDataItem
	closed := false

	c.OnRequest(func(r *colly.Request) {
		r.Ctx.Put("locationName", locationName)
	})

	c.OnResponse(func(r *colly.Response) {
		locName := r.Ctx.Get("locationName")
		var jsonResponse models.DiningHallResponse

		err := json.Unmarshal(r.Body, &jsonResponse)
		if err != nil {
			log.Printf("Error unmarshalling JSON for %s: %v", locName, err)
			return
		}

		parsedDailyItems, parsedAllDataItems, err := parseItems(jsonResponse, locName, timeOfDay)
		if err != nil {
			log.Printf("Error posting items for %s: %v", locName, err)
			return
		}

		dailyItems = append(dailyItems, parsedDailyItems...)
		allDataItems = append(allDataItems, parsedAllDataItems...)
	})

	c.OnError(func(r *colly.Response, err error) {
		log.Printf("Error for %s: %v", locationName, err)
	})

	err := c.Visit(url)
	if err != nil {
		log.Printf("Visit failed for URL %s: %v", url, err)
		return nil, nil, closed, err
	}
	return dailyItems, allDataItems, closed, nil
}

// parseItems parses menu items from the API response.
//
// Parameters:
//   - menu: The menu data from the API response.
//   - location: The name of the dining hall location.
//   - timeOfDay: The service time (e.g., "Breakfast", "Lunch", "Dinner").
//
// Returns:
//   - []models.DailyItem: A list of parsed daily menu items.
//   - []models.AllDataItem: A list of parsed all data items.
//   - error: An error, if any occurred during parsing.
func parseItems(jsonResponse models.DiningHallResponse, location, timeOfDay string) ([]models.DailyItem, []models.AllDataItem, error) {
	var dailyItems []models.DailyItem
	var allDataItems []models.AllDataItem
	period := jsonResponse.Period
	date := jsonResponse.Date

	// Ensure Periods is not nil
	if period.Categories == nil {
		log.Println("No categories found for this menu period")
		return dailyItems, allDataItems, nil // Return empty slices, not an error
	}

	for _, category := range period.Categories {
		// Ensure Items is not nil and check for ingredient categories
		cleanedCategory := strings.ToLower(strings.TrimSpace(category.Name))
		if category.Items == nil || contains(IngredientCategories, cleanedCategory) {
			continue
		}

		for _, item := range category.Items {
			cleanedItem := strings.ToLower(strings.TrimSpace(item.Name))
			if contains(Ingredients, cleanedItem) {
				continue
			}

			// Create AllDataItem first
			allDataItem := models.AllDataItem{
				Name: item.Name,
			}

			// Create DailyItem
			dailyItem := models.DailyItem{
				Name:        item.Name,
				Description: item.Description,
				Date:        date,
				Location:    location,
				StationName: category.Name,
				TimeOfDay:   timeOfDay,
				PortionSize: item.Portion,
			}

			// Extract nutrient information
			if item.Nutrients != nil {
				for _, nutrient := range item.Nutrients {
					switch nutrient.Name {
					case "Calories":
						dailyItem.Calories = nutrient.Value
					case "Protein (g)":
						dailyItem.Protein = nutrient.Value
					case "Total Carbohydrates (g)":
						dailyItem.Carbs = nutrient.Value
					case "Total Fat (g)":
						dailyItem.Fat = nutrient.Value
					}
				}
			}

			dailyItems = append(dailyItems, dailyItem)
			allDataItems = append(allDataItems, allDataItem)
		}
	}

	return dailyItems, allDataItems, nil
}

// parseLocationOperatingTimes parses operating times for multiple locations.
//
// Parameters:
//   - locations: A list of location operation information from the API response.
//
// Returns:
//   - []models.LocationOperatingTimes: A list of parsed operating times for locations.
//   - error: An error, if any occurred during parsing.
func parseLocationOperatingTimes(locations []models.LocationOperatingInfo) ([]models.LocationOperatingTimes, error) {
	fmt.Printf("Posting location operating times for %d locations\n", len(locations))
	var locationOperatingTimesList []models.LocationOperatingTimes

	for _, location := range locations {
		fmt.Printf("Location: %s\n", location.Name)

		parsedInfo := models.LocationOperatingTimes{
			Name: location.Name,
			Week: convertWeekOperationInfoJSON(location.Week),
		}

		locationOperatingTimesList = append(locationOperatingTimesList, parsedInfo)
	}

	return locationOperatingTimesList, nil
}
