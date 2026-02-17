package main

import (
	"backend/internal/db"
	"backend/internal/models"
	"backend/internal/scraper"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	var dateStr string
	var windowDays int
	var retries int
	var scrapeHours bool

	flag.StringVar(&dateStr, "date", time.Now().Format("2006-01-02"), "base date (YYYY-MM-DD)")
	flag.IntVar(&windowDays, "window", 3, "scrape window (+/- days from base date)")
	flag.IntVar(&retries, "retries", 3, "retries per scrape call")
	flag.BoolVar(&scrapeHours, "hours", true, "also scrape and update location operating hours")
	flag.Parse()

	// Local convenience only; Railway will use env vars directly.
	_ = godotenv.Load()

	postgresURL := os.Getenv("POSTGRES_URL")
	if postgresURL == "" {
		log.Fatal("POSTGRES_URL is required")
	}

	baseDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		log.Fatalf("invalid -date format %q: %v", dateStr, err)
	}

	if err := db.InitDB(postgresURL); err != nil {
		log.Fatalf("failed to init db: %v", err)
	}

	s := scraper.NewBrowserAPIScraper()
	if retries > 0 {
		s.MaxRetries = retries
	}

	var weeklyItems []models.WeeklyItem
	var totalAllItems []models.AllDataItem

	for dayIndex := -windowDays; dayIndex <= windowDays; dayIndex++ {
		scrapeDate := baseDate.AddDate(0, 0, dayIndex).Format("2006-01-02")
		log.Printf("scraping menu for date=%s dayIndex=%d", scrapeDate, dayIndex)

		var dItems []models.DailyItem
		var aItems []models.AllDataItem
		var scrapeErr error

		for attempt := 1; attempt <= retries; attempt++ {
			dItems, aItems, _, scrapeErr = s.ScrapeFood(scrapeDate)
			if scrapeErr == nil {
				break
			}
			log.Printf("scrape failed date=%s attempt=%d/%d err=%v", scrapeDate, attempt, retries, scrapeErr)
		}

		if scrapeErr != nil {
			log.Printf("skipping date=%s after retries; err=%v", scrapeDate, scrapeErr)
			continue
		}

		if len(dItems) == 0 {
			log.Printf("no menu items for date=%s", scrapeDate)
			continue
		}

		for _, dItem := range dItems {
			weeklyItems = append(weeklyItems, models.WeeklyItem{
				DailyItem: dItem,
				DayIndex:  dayIndex,
			})
		}
		totalAllItems = append(totalAllItems, aItems...)

		log.Printf("date=%s daily_items=%d all_items=%d", scrapeDate, len(dItems), len(aItems))
	}

	if len(weeklyItems) == 0 && len(totalAllItems) == 0 {
		log.Fatal("no data scraped for any day; aborting db update")
	}

	if err := db.DeleteWeeklyItems(); err != nil {
		log.Fatalf("failed to clear weekly items: %v", err)
	}
	if err := db.InsertWeeklyItems(weeklyItems); err != nil {
		log.Fatalf("failed to insert weekly items: %v", err)
	}
	if err := db.InsertAllDataItems(totalAllItems); err != nil {
		log.Fatalf("failed to insert all data items: %v", err)
	}

	log.Printf("menu update complete weekly_items=%d all_items=%d", len(weeklyItems), len(totalAllItems))

	if scrapeHours {
		hoursDate := baseDate.UTC().AddDate(0, 0, 1).Format("2006-01-02")
		log.Printf("scraping operating hours date=%s", hoursDate)

		var hours []models.LocationOperatingTimes
		var hoursErr error

		for attempt := 1; attempt <= retries; attempt++ {
			hours, hoursErr = s.ScrapeLocationOperatingTimes(hoursDate)
			if hoursErr == nil {
				break
			}
			log.Printf("hours scrape failed attempt=%d/%d err=%v", attempt, retries, hoursErr)
		}

		if hoursErr != nil {
			log.Fatalf("failed to scrape operating hours: %v", hoursErr)
		}
		if len(hours) == 0 {
			log.Fatal("hours scrape returned zero locations")
		}

		if err := db.DeleteLocationOperatingTimes(); err != nil {
			log.Fatalf("failed to clear location operating times: %v", err)
		}
		if err := db.InsertLocationOperatingTimes(hours); err != nil {
			log.Fatalf("failed to insert location operating times: %v", err)
		}

		log.Printf("hours update complete locations=%d", len(hours))
	}

	fmt.Println("local scrape sync complete")
}
