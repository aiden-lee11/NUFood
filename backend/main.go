package main

import (
	"backend/internal/api"
	"backend/internal/db"
	"fmt"
	"github.com/joho/godotenv"
	"log"
	"net/http"
	"os"
)

// Main function takes in flags for if the user wants to scrape, if the user wants to run the Tinder app, and if the user wants to get the favorites.
func main() {
	// Load .env file only if not in production
	if os.Getenv("RENDER") != "true" {
		env_err := godotenv.Load()
		if env_err != nil {
			log.Printf("Error loading .env file: %v", env_err)
		}
	}

	POSTGRES_URL := os.Getenv("POSTGRES_URL")
	if POSTGRES_URL == "" {
		log.Fatal("POSTGRES_URL environment variable is not set")
	}

	err := db.InitDB(POSTGRES_URL)

	if err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}

	fmt.Println("Database initialized successfully")

	// Define the route for getting favorites
	http.HandleFunc("/api/favorites", api.GetAvailableFavoritesHandler)
	http.HandleFunc("/api/data", api.GetAllDataItemsHander)
	http.HandleFunc("/api/userPreferences", api.UserPreferencesHandler)
	http.HandleFunc("/api/dailyItems", api.GetAllDailyItemsHander)
	http.HandleFunc("/api/scrapeDailyItems", api.ScrapeDailyItemsHandler)
	http.HandleFunc("/api/scrapeHistorical", api.ScrapeHistoricalItemsHandler)

	// Start the HTTP server on port 8080
	http.ListenAndServe(":8081", nil)
	fmt.Println("Server started on port 8081")
}
