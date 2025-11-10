package scraper

import (
	"backend/internal/models"
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
	"golang.org/x/net/html"
)

// LocationURLMapping maps internal location names to their URL slugs
var LocationURLMapping = map[string]string{
	"Allison":   "allison-dining-commons",
	"Sargent":   "sargent-dining-commons",
	"Plex East": "foster-walker-plex-east",
	"Plex West": "foster-walker-plex-west",
	"Elder":     "elder-dining-commons",
}

// MealPeriods defines the meal periods to scrape
var MealPeriods = []string{"breakfast", "lunch", "dinner"}

// ChromeDPScraper represents a scraper using chromedp for dining hall information
type ChromeDPScraper struct {
	Locations []string // List of location names to scrape
}

// NewChromeDPScraper creates a new ChromeDPScraper with default locations
func NewChromeDPScraper() *ChromeDPScraper {
	return &ChromeDPScraper{
		Locations: []string{"Allison", "Sargent", "Plex East", "Plex West", "Elder"},
	}
}

// ScrapeFood scrapes daily menu items for a given date using chromedp.
// It iterates through configured locations and meal periods, scraping web pages to gather menu data.
//
// Parameters:
//   - date: The date for which to scrape food data (format: "2006-01-02", e.g., "2025-11-09").
//
// Returns:
//   - []models.DailyItem: A list of daily menu items.
//   - []models.AllDataItem: A list of all data items.
//   - bool: Indicates whether all locations are closed.
//   - error: An error, if any occurred during the scraping process.
func (s *ChromeDPScraper) ScrapeFood(date string) ([]models.DailyItem, []models.AllDataItem, bool, error) {
	var dailyItems []models.DailyItem
	var allDataItems []models.AllDataItem
	allClosed := true

	for _, location := range s.Locations {
		fmt.Printf("Scraping location %s\n", location)

		locationSlug, ok := LocationURLMapping[location]
		if !ok {
			log.Printf("No URL mapping found for location %s, skipping\n", location)
			continue
		}

		for _, mealPeriod := range MealPeriods {
			url := buildURL(locationSlug, date, mealPeriod)
			fmt.Printf("Scraping URL: %s\n", url)

			htmlContent, err := scrapeDiningMenu(url)
			if err != nil {
				log.Printf("Error scraping %s - %s: %v\n", location, mealPeriod, err)
				continue
			}

			dItems, aItems, err := parseMenuItems(htmlContent, location, mealPeriod, date)
			if err != nil {
				log.Printf("Error parsing menu items for %s - %s: %v\n", location, mealPeriod, err)
				continue
			}

			if len(dItems) > 0 {
				allClosed = false
			}

			dailyItems = append(dailyItems, dItems...)
			allDataItems = append(allDataItems, aItems...)
		}
	}

	fmt.Println("Scraping successful")
	return dailyItems, allDataItems, allClosed, nil
}

// buildURL constructs the dining hall menu URL
func buildURL(locationSlug, date, mealPeriod string) string {
	return fmt.Sprintf("https://dineoncampus.com/northwestern/whats-on-the-menu/%s/%s/%s",
		locationSlug, date, mealPeriod)
}

// scrapeDiningMenu fetches the HTML content from the URL using chromedp
func scrapeDiningMenu(url string) (string, error) {
	// Create chrome instance with options
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancel()

	// Create context
	ctx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	// Set timeout
	ctx, cancel = context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	var htmlContent string

	// Run chromedp tasks
	err := chromedp.Run(ctx,
		chromedp.Navigate(url),
		// Wait for body to be visible
		chromedp.WaitVisible(`body`, chromedp.ByQuery),
		// Wait for dynamic content to load
		chromedp.Sleep(8*time.Second),
		chromedp.OuterHTML("html", &htmlContent, chromedp.ByQuery),
	)

	if err != nil {
		return "", fmt.Errorf("failed to scrape: %w", err)
	}

	return htmlContent, nil
}

// extractText extracts all text content from HTML
func extractText(htmlContent string) ([]string, error) {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return nil, err
	}

	var lines []string
	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.TextNode {
			text := strings.TrimSpace(n.Data)
			if text != "" {
				lines = append(lines, text)
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)

	return lines, nil
}

// parseMenuItems parses the menu data from HTML content
func parseMenuItems(htmlContent, location, mealPeriod, date string) ([]models.DailyItem, []models.AllDataItem, error) {
	lines, err := extractText(htmlContent)
	if err != nil {
		return nil, nil, err
	}

	var dailyItems []models.DailyItem
	var allDataItems []models.AllDataItem

	// Normalize meal period to match expected format (capitalize first letter)
	timeOfDay := strings.Title(strings.ToLower(mealPeriod))

	// Parse menu items
	var currentCategory string
	categoryKeywords := []string{"Comfort", "Rooted", "Fruit", "Cereals", "Bakery", "Beverage", "Grill", "Halal", "Kosher", "Flame", "Pantry"}
	skipKeywords := []string{"Click any item", "Menu Item", "Portion", "Calories", "Favorite"}
	portionUnits := []string{"cup", "oz", "slice", "each", "fl", "tbsp", "tsp", "ounce", "piece"}

	for i := 0; i < len(lines); i++ {
		line := lines[i]

		// Check if this is a category header
		isCategory := false
		for _, keyword := range categoryKeywords {
			if strings.Contains(line, keyword) {
				isSkip := false
				for _, skip := range skipKeywords {
					if strings.Contains(line, skip) {
						isSkip = true
						break
					}
				}
				if !isSkip {
					isCategory = true
					break
				}
			}
		}

		if isCategory {
			// Check if this category should be filtered out
			cleanedCategory := strings.ToLower(strings.TrimSpace(line))
			if contains(IngredientCategories, cleanedCategory) {
				currentCategory = "" // Set to empty to skip items in this category
			} else {
				currentCategory = line
			}
			continue
		}

		// Look for calorie numbers to identify items
		calories, err := strconv.Atoi(line)
		if err == nil && calories < 2500 && currentCategory != "" && i >= 2 {
			portion := ""
			if i >= 1 {
				portion = lines[i-1]
			}

			potentialDescOrName := ""
			if i >= 2 {
				potentialDescOrName = lines[i-2]
			}

			itemName := ""
			description := ""

			// If line i-3 exists and isn't a header/label, it's likely the item name with description
			if i >= 3 {
				skip := false
				for _, s := range skipKeywords {
					if lines[i-3] == s {
						skip = true
						break
					}
				}
				if !skip {
					itemName = lines[i-3]
					description = potentialDescOrName
				} else {
					itemName = potentialDescOrName
				}
			} else {
				itemName = potentialDescOrName
			}

			// Validate this looks like a real menu item
			isValidItem := itemName != ""
			for _, skip := range skipKeywords {
				if itemName == skip || strings.Contains(itemName, skip) {
					isValidItem = false
					break
				}
			}

			// Check if item should be filtered out
			cleanedItem := strings.ToLower(strings.TrimSpace(itemName))
			if contains(Ingredients, cleanedItem) {
				isValidItem = false
			}

			// Check if portion contains typical serving info patterns
			hasPortionUnit := false
			portionLower := strings.ToLower(portion)
			for _, unit := range portionUnits {
				if strings.Contains(portionLower, unit) {
					hasPortionUnit = true
					break
				}
			}

			if isValidItem && hasPortionUnit {
				// Clean up description
				if len(description) <= 15 || description == itemName {
					description = ""
				}

				dailyItem := models.DailyItem{
					Name:        itemName,
					Description: description,
					Date:        date,
					Location:    location,
					StationName: currentCategory,
					TimeOfDay:   timeOfDay,
					PortionSize: portion,
					Calories:    strconv.Itoa(calories), // Convert to string
					Protein:     "",                     // Leave empty for now
					Carbs:       "",                     // Leave empty for now
					Fat:         "",                     // Leave empty for now
				}

				allDataItem := models.AllDataItem{
					Name: itemName,
				}

				dailyItems = append(dailyItems, dailyItem)
				allDataItems = append(allDataItems, allDataItem)
			}
		}
	}

	return dailyItems, allDataItems, nil
}

// ScrapeLocationOperatingTimes is a placeholder for the new scraper
// This functionality would need to be reimplemented with chromedp if needed
func (s *ChromeDPScraper) ScrapeLocationOperatingTimes(date string) ([]models.LocationOperatingTimes, error) {
	return nil, fmt.Errorf("ScrapeLocationOperatingTimes not yet implemented for ChromeDPScraper")
}
