package scraper

import (
	"backend/internal/models"
	"fmt"
	"log"
	"strings"
)

type ScrapeConfig struct {
	Locations []models.Location
	SiteID    string
	BaseURL   string
}

var DefaultConfig = ScrapeConfig{
	Locations: []models.Location{
		{Name: "Allison", Hash: "5b33ae291178e909d807593d"},
		{Name: "Sargent", Hash: "5b33ae291178e909d807593e"},
		{Name: "Plex East", Hash: "5bae7de3f3eeb60c7d3854ba"},
		{Name: "Plex West", Hash: "5bae7ee9f3eeb60cb4f8f3af"},
		{Name: "Elder", Hash: "5d113c924198d409c34fdf5c"},
	},
	SiteID:  "5acea5d8f3eeb60b08c5a50d",
	BaseURL: "https://apiv4.dineoncampus.com",
}

func parseItems(jsonResponse models.DiningHallResponse, location, timeOfDay string) ([]models.DailyItem, []models.AllDataItem, error) {
	var dailyItems []models.DailyItem
	var allDataItems []models.AllDataItem
	period := jsonResponse.Period
	date := jsonResponse.Date

	if strings.TrimSpace(date) == "" {
		return nil, nil, fmt.Errorf("menu response has no date")
	}
	if period.Categories == nil {
		log.Printf("No categories found for %s at %s on %s", location, timeOfDay, date)
		return dailyItems, allDataItems, nil
	}

	for _, category := range period.Categories {
		cleanedCategory := strings.ToLower(strings.TrimSpace(category.Name))
		if category.Items == nil || contains(IngredientCategories, cleanedCategory) {
			continue
		}

		for _, item := range category.Items {
			cleanedItem := strings.ToLower(strings.TrimSpace(item.Name))
			if cleanedItem == "" || contains(Ingredients, cleanedItem) {
				continue
			}

			dailyItem := models.DailyItem{
				Name:        strings.TrimSpace(item.Name),
				Description: item.Description,
				Date:        date,
				Location:    location,
				StationName: category.Name,
				TimeOfDay:   timeOfDay,
				PortionSize: item.Portion,
			}

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

			dailyItems = append(dailyItems, dailyItem)
			allDataItems = append(allDataItems, models.AllDataItem{Name: dailyItem.Name})
		}
	}

	return dailyItems, allDataItems, nil
}

func parseLocationOperatingTimes(locations []models.LocationOperatingInfo) ([]models.LocationOperatingTimes, error) {
	locationOperatingTimes := make([]models.LocationOperatingTimes, 0, len(locations))
	for _, location := range locations {
		if strings.TrimSpace(location.Name) == "" {
			continue
		}
		locationOperatingTimes = append(locationOperatingTimes, models.LocationOperatingTimes{
			Name: location.Name,
			Week: convertWeekOperationInfoJSON(location.Week),
		})
	}
	return locationOperatingTimes, nil
}
