package main

import (
	"backend/internal/db"
	"backend/internal/scrapejob"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	var dateStr string
	var daysForward int
	var retries int
	var scrapeHours bool

	flag.StringVar(&dateStr, "date", time.Now().Format("2006-01-02"), "base date (YYYY-MM-DD)")
	flag.IntVar(&daysForward, "forward", 5, "scrape base date through base date + forward days")
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

	if err := scrapejob.Run(scrapejob.Options{
		BaseDate:    baseDate,
		DaysForward: daysForward,
		Retries:     retries,
		ScrapeHours: scrapeHours,
	}); err != nil {
		log.Fatalf("scrape sync failed: %v", err)
	}

	fmt.Println("local scrape sync complete")
}
