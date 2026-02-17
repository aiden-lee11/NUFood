package scraper

import (
	"backend/internal/models"
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
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
// It concurrently scrapes all locations and meal periods to speed up the process.
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
	var mu sync.Mutex
	var wg sync.WaitGroup
	allClosed := true

	// Create a buffered channel to limit concurrent requests
	// Limit to 5 concurrent requests to avoid overwhelming the server
	semaphore := make(chan struct{}, 5)

	for _, location := range s.Locations {
		locationSlug, ok := LocationURLMapping[location]
		if !ok {
			log.Printf("No URL mapping found for location %s, skipping\n", location)
			continue
		}

		for _, mealPeriod := range MealPeriods {
			wg.Add(1)
			go func(loc, locSlug, meal string) {
				defer wg.Done()

				// Acquire semaphore
				semaphore <- struct{}{}
				defer func() { <-semaphore }()

				url := buildURL(locSlug, date, meal)
				fmt.Printf("Scraping URL: %s\n", url)

				htmlContent, err := scrapeDiningMenu(url)
				if err != nil {
					log.Printf("Error scraping %s - %s: %v\n", loc, meal, err)
					return
				}

				dItems, aItems, err := parseMenuItems(htmlContent, loc, meal, date)
				if err != nil {
					log.Printf("Error parsing menu items for %s - %s: %v\n", loc, meal, err)
					return
				}

				// Thread-safe append to shared slices
				mu.Lock()
				if len(dItems) > 0 {
					allClosed = false
				}
				dailyItems = append(dailyItems, dItems...)
				allDataItems = append(allDataItems, aItems...)
				mu.Unlock()

				fmt.Printf("✓ Completed %s - %s (%d items)\n", loc, meal, len(dItems))
			}(location, locationSlug, mealPeriod)
		}
	}

	// Wait for all goroutines to complete
	wg.Wait()
	close(semaphore)

	fmt.Printf("Scraping successful - Total items: %d\n", len(dailyItems))
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

// ScrapeLocationOperatingTimes scrapes operating times for all dining locations using chromedp.
// It visits the consolidated hours-of-operation page and extracts the weekly schedule for all locations.
//
// Parameters:
//   - date: The date for which to scrape operating times (format: "2006-01-02"). Currently unused but kept for API compatibility.
//
// Returns:
//   - []models.LocationOperatingTimes: A list of operating times for each location.
//   - error: An error, if any occurred during the scraping process.
func (s *ChromeDPScraper) ScrapeLocationOperatingTimes(date string) ([]models.LocationOperatingTimes, error) {
	url := "https://dineoncampus.com/northwestern/hours-of-operation"
	fmt.Printf("Scraping operating hours from: %s\n", url)

	htmlContent, err := scrapeOperatingHoursPage(url)
	if err != nil {
		return nil, fmt.Errorf("failed to scrape hours page: %w", err)
	}

	locationOperatingTimesList, err := parseAllOperatingHours(htmlContent, s.Locations)
	if err != nil {
		return nil, fmt.Errorf("failed to parse operating hours: %w", err)
	}

	return locationOperatingTimesList, nil
}

// scrapeOperatingHoursPage fetches the hours page and navigates to the current week
func scrapeOperatingHoursPage(url string) (string, error) {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancel()

	ctx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	var htmlContent string

	// The page seems to default to a specific week, we may need to click "next" arrows
	// to get to the current week. Let's check the displayed week and navigate if needed.

	err := chromedp.Run(ctx,
		chromedp.Navigate(url),
		chromedp.WaitVisible(`body`, chromedp.ByQuery),
		chromedp.Sleep(8*time.Second), // Wait for initial load

		// Try to click "next week" arrows if needed to get to current week
		// Look for text containing "week of" to determine current displayed week
		chromedp.ActionFunc(func(ctx context.Context) error {
			// Try clicking the "next" button multiple times to advance to current week
			// The button might be an arrow or navigation element
			for i := 0; i < 3; i++ { // Try up to 3 weeks ahead
				// Try to find and click a "next" or forward arrow button
				// Common selectors: button with arrow, .next, [aria-label="Next"]
				err := chromedp.Run(ctx,
					chromedp.Click(`button[aria-label*="next" i], button:has(svg), .next-week, button.next`, chromedp.ByQuery),
					chromedp.Sleep(2*time.Second),
				)
				if err != nil {
					// No more next button or couldn't find it
					break
				}
			}
			return nil
		}),

		chromedp.OuterHTML("html", &htmlContent, chromedp.ByQuery),
	)

	if err != nil {
		return "", fmt.Errorf("failed to scrape: %w", err)
	}

	return htmlContent, nil
}

// parseAllOperatingHours parses the consolidated hours-of-operation page
func parseAllOperatingHours(htmlContent string, locationNames []string) ([]models.LocationOperatingTimes, error) {
	lines, err := extractText(htmlContent)
	if err != nil {
		return nil, err
	}

	// Find the "week of" date to calculate actual dates
	var weekStartDate time.Time
	for _, line := range lines {
		if strings.Contains(line, "week of") {
			// Extract date from "Hours of operation for X for week of November 2, 2025"
			parts := strings.Split(line, "week of")
			if len(parts) > 1 {
				dateStr := strings.TrimSpace(parts[1])
				weekStartDate = parseWeekOfDate(dateStr)
				break
			}
		}
	}

	if weekStartDate.IsZero() {
		// Fallback to current week if we can't find it
		weekStartDate = time.Now()
		// Adjust to Sunday
		weekStartDate = weekStartDate.AddDate(0, 0, -int(weekStartDate.Weekday()))
	}

	var result []models.LocationOperatingTimes

	// For each location we want to track
	for _, locationName := range locationNames {
		// Find the location in the text
		locationFound := false
		startIndex := -1
		fullLocationName := ""

		// Look for the location name (it appears twice consecutively)
		for i := 0; i < len(lines)-1; i++ {
			if strings.Contains(lines[i], locationName) && strings.Contains(lines[i+1], locationName) {
				startIndex = i + 2 // Start after the duplicate name
				locationFound = true
				fullLocationName = strings.TrimSpace(lines[i]) // Use the full name from HTML
				break
			}
		}

		locationTimes := models.LocationOperatingTimes{
			Name: fullLocationName, // Use the full name from HTML
			Week: make([]models.DailyOperatingTimes, 7),
		}

		if !locationFound {
			fmt.Printf("Warning: %s not found in hours page\n", locationName)
			continue
		}

		// Parse the next 7 days
		// Note: The HTML shows each day as 2 lines (same time repeated), so we skip duplicates
		dayIndex := 0
		lineIndex := startIndex

		for dayIndex < 7 && lineIndex < len(lines) {
			currentDate := weekStartDate.AddDate(0, 0, dayIndex)

			dailyHours := models.DailyOperatingTimes{
				Day:    dayIndex,
				Date:   currentDate.Format("2006-01-02"),
				Status: "open",
				Hours:  []models.HourlyTimes{},
			}

			// Check if the line looks like a time range
			line := strings.TrimSpace(lines[lineIndex])

			// Check if we've hit the next location (location names contain "Dining" or end patterns)
			if strings.Contains(line, "Dining") || strings.Contains(line, "Norris") ||
				strings.Contains(line, "Coffee") || strings.Contains(line, "Retail") {
				// We've hit the next section, stop parsing this location
				break
			}

			// Parse time ranges (format: "7:00a - 8:00p" or "11:00a - 2:00p")
			if strings.Contains(line, " - ") && (strings.Contains(line, "a") || strings.Contains(line, "p")) {
				times := parseSimpleTimeRange(line)
				if len(times) > 0 {
					dailyHours.Hours = append(dailyHours.Hours, times...)
				}
				lineIndex++

				// Skip the duplicate line (same time appears twice in HTML for each day)
				if lineIndex < len(lines) {
					nextLine := strings.TrimSpace(lines[lineIndex])
					// If next line is identical, skip it
					if nextLine == line {
						lineIndex++
					} else if strings.Contains(nextLine, " - ") && (strings.Contains(nextLine, "a") || strings.Contains(nextLine, "p")) {
						// If it's different, it's a second time range (lunch + dinner)
						moreTimes := parseSimpleTimeRange(nextLine)
						if len(moreTimes) > 0 {
							dailyHours.Hours = append(dailyHours.Hours, moreTimes...)
						}
						lineIndex++

						// Skip duplicate of second time range if exists
						if lineIndex < len(lines) && strings.TrimSpace(lines[lineIndex]) == nextLine {
							lineIndex++
						}
					}
				}

				// Check for closed status
				if len(dailyHours.Hours) == 0 {
					dailyHours.Status = "closed"
				}

				locationTimes.Week[dayIndex] = dailyHours
				dayIndex++
			} else {
				// Not a time format, move to next line
				lineIndex++
			}
		}

		result = append(result, locationTimes)
	}

	return result, nil
}

// parseWeekOfDate parses a date string like "November 2, 2025" and returns the date
func parseWeekOfDate(dateStr string) time.Time {
	// Parse formats like "November 2, 2025"
	layout := "January 2, 2006"
	t, err := time.Parse(layout, dateStr)
	if err != nil {
		fmt.Printf("Error parsing week date: %v\n", err)
		return time.Time{}
	}
	return t
}

// parseSimpleTimeRange parses a time range like "7:00a - 8:00p" and returns HourlyTimes
func parseSimpleTimeRange(timeStr string) []models.HourlyTimes {
	// Format: "7:00a - 8:00p" or "11:00a - 2:00p"
	parts := strings.Split(timeStr, " - ")
	if len(parts) != 2 {
		return nil
	}

	startTime := strings.TrimSpace(parts[0])
	endTime := strings.TrimSpace(parts[1])

	// Normalize: "7:00a" -> "7:00 AM"
	startTime = normalizeTime(startTime)
	endTime = normalizeTime(endTime)

	startHour, startMin := parseTime(startTime)
	endHour, endMin := parseTime(endTime)

	if startHour == -1 || endHour == -1 {
		return nil
	}

	return []models.HourlyTimes{
		{
			StartHour:    startHour,
			StartMinutes: startMin,
			EndHour:      endHour,
			EndMinutes:   endMin,
		},
	}
}

// normalizeTime converts "7:00a" to "7:00 AM" and "8:00p" to "8:00 PM"
func normalizeTime(timeStr string) string {
	timeStr = strings.TrimSpace(timeStr)
	if strings.HasSuffix(timeStr, "a") {
		return strings.TrimSuffix(timeStr, "a") + " AM"
	}
	if strings.HasSuffix(timeStr, "p") {
		return strings.TrimSuffix(timeStr, "p") + " PM"
	}
	return timeStr
}

// parseOperatingHours parses operating hours from location page HTML (OLD - kept for backwards compatibility)
func parseOperatingHours(htmlContent, locationName string) (models.LocationOperatingTimes, error) {
	lines, err := extractText(htmlContent)
	if err != nil {
		return models.LocationOperatingTimes{}, err
	}

	var week []models.DailyOperatingTimes
	daysOfWeek := []string{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}

	// Parse each day's hours
	for dayIndex, dayName := range daysOfWeek {
		dailyHours := models.DailyOperatingTimes{
			Day:    dayIndex,
			Date:   "", // We don't have specific dates from the location page
			Status: "open",
			Hours:  []models.HourlyTimes{},
		}

		// Find the day name in the lines
		for i, line := range lines {
			// Check if line contains the day name (case-insensitive, exact match)
			if strings.EqualFold(strings.TrimSpace(line), dayName) {
				// Look ahead for time information in next few lines
				// Structure is: DayName, Date, StartTime, "-", EndTime
				if i+4 < len(lines) {
					// Get the date from line i+1 and convert to YYYY-MM-DD format
					dateLine := strings.TrimSpace(lines[i+1])
					formattedDate := parseDateString(dateLine)
					dailyHours.Date = formattedDate

					// Check for closed status
					closedCheck := strings.ToLower(dateLine) + " " + strings.ToLower(lines[i+2])
					if strings.Contains(closedCheck, "closed") {
						dailyHours.Status = "closed"
						break
					}

					// Get start time (i+2), dash (i+3), end time (i+4)
					startTimeLine := strings.TrimSpace(lines[i+2])
					endTimeLine := strings.TrimSpace(lines[i+4])

					// Check if these look like times (contain "am" or "pm")
					startLower := strings.ToLower(startTimeLine)
					endLower := strings.ToLower(endTimeLine)

					if (strings.Contains(startLower, "am") || strings.Contains(startLower, "pm")) &&
						(strings.Contains(endLower, "am") || strings.Contains(endLower, "pm")) {

						// Normalize to uppercase for our parser
						startTime := strings.Replace(strings.Replace(startTimeLine, " am", " AM", 1), " pm", " PM", 1)
						endTime := strings.Replace(strings.Replace(endTimeLine, " am", " AM", 1), " pm", " PM", 1)

						// Parse the times
						startHour, startMin := parseTime(startTime)
						endHour, endMin := parseTime(endTime)

						if startHour != -1 && endHour != -1 {
							dailyHours.Hours = []models.HourlyTimes{
								{
									StartHour:    startHour,
									StartMinutes: startMin,
									EndHour:      endHour,
									EndMinutes:   endMin,
								},
							}
						}
					}
				}
				break
			}
		}

		week = append(week, dailyHours)
	}

	return models.LocationOperatingTimes{
		Name: locationName,
		Week: week,
	}, nil
}

// parseTimeRanges parses time range strings like "7:00 AM - 2:00 PM, 5:00 PM - 8:00 PM"
func parseTimeRanges(timeStr string) []models.HourlyTimes {
	var hourlyTimes []models.HourlyTimes

	// Split by comma for multiple time ranges
	ranges := strings.Split(timeStr, ",")

	for _, rangeStr := range ranges {
		rangeStr = strings.TrimSpace(rangeStr)

		// Look for pattern like "7:00 AM - 2:00 PM"
		parts := strings.Split(rangeStr, "-")
		if len(parts) != 2 {
			continue
		}

		startTime := strings.TrimSpace(parts[0])
		endTime := strings.TrimSpace(parts[1])

		startHour, startMin := parseTime(startTime)
		endHour, endMin := parseTime(endTime)

		if startHour != -1 && endHour != -1 {
			hourlyTimes = append(hourlyTimes, models.HourlyTimes{
				StartHour:    startHour,
				StartMinutes: startMin,
				EndHour:      endHour,
				EndMinutes:   endMin,
			})
		}
	}

	return hourlyTimes
}

// parseDateString converts a date string like "November 2nd" to "YYYY-MM-DD" format
func parseDateString(dateStr string) string {
	// Parse dates like "November 2nd", "December 31st", etc.
	dateStr = strings.TrimSpace(dateStr)

	// Month mapping
	monthMap := map[string]string{
		"January": "01", "February": "02", "March": "03", "April": "04",
		"May": "05", "June": "06", "July": "07", "August": "08",
		"September": "09", "October": "10", "November": "11", "December": "12",
	}

	// Split by space to get month and day
	parts := strings.Fields(dateStr)
	if len(parts) < 2 {
		return "" // Invalid format
	}

	monthName := parts[0]
	dayStr := parts[1]

	// Remove ordinal suffix (st, nd, rd, th)
	dayStr = strings.TrimSuffix(dayStr, "st")
	dayStr = strings.TrimSuffix(dayStr, "nd")
	dayStr = strings.TrimSuffix(dayStr, "rd")
	dayStr = strings.TrimSuffix(dayStr, "th")

	// Get month number
	monthNum, ok := monthMap[monthName]
	if !ok {
		return "" // Unknown month
	}

	// Parse day
	day, err := strconv.Atoi(dayStr)
	if err != nil {
		return ""
	}

	// Determine year - use current year, but handle year boundary
	now := time.Now()
	year := now.Year()
	currentMonth := int(now.Month())

	// Parse the month from our string
	monthInt, _ := strconv.Atoi(monthNum)

	// If we're in December and seeing January dates, assume next year
	if currentMonth == 12 && monthInt == 1 {
		year++
	}
	// If we're in January and seeing December dates, assume last year
	if currentMonth == 1 && monthInt == 12 {
		year--
	}

	// Format as YYYY-MM-DD
	return fmt.Sprintf("%d-%s-%02d", year, monthNum, day)
}

// parseTime parses a time string like "7:00 AM" or "2:00 PM" and returns hour and minutes in 24-hour format
func parseTime(timeStr string) (hour int, minutes int) {
	timeStr = strings.TrimSpace(timeStr)

	// Check for AM/PM
	isPM := strings.Contains(strings.ToUpper(timeStr), "PM")
	isAM := strings.Contains(strings.ToUpper(timeStr), "AM")

	// Remove AM/PM
	timeStr = strings.Replace(strings.Replace(strings.ToUpper(timeStr), "AM", "", -1), "PM", "", -1)
	timeStr = strings.TrimSpace(timeStr)

	// Split by colon
	parts := strings.Split(timeStr, ":")
	if len(parts) != 2 {
		return -1, -1
	}

	hour, err := strconv.Atoi(parts[0])
	if err != nil {
		return -1, -1
	}

	minutes, err = strconv.Atoi(parts[1])
	if err != nil {
		return -1, -1
	}

	// Convert to 24-hour format
	if isPM && hour != 12 {
		hour += 12
	} else if isAM && hour == 12 {
		hour = 0
	}

	return hour, minutes
}
