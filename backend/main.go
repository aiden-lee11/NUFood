package main

import (
	"backend/internal/api"
	"backend/internal/auth"
	"backend/internal/db"
	"backend/internal/middleware"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"log"
	"net/http"
	"os"
)

func main() {
	// Load env if not in production
	if os.Getenv("RENDER") != "true" && os.Getenv("RAILWAY") != "true" {
		if err := godotenv.Load(); err != nil {
			log.Printf("Error loading .env file: %v", err)
		}
	}

	if err := auth.InitFirebase(); err != nil {
		log.Fatalf("Error initializing Firebase: %v", err)
	}

	POSTGRES_URL := os.Getenv("POSTGRES_URL")
	if POSTGRES_URL == "" {
		log.Fatal("POSTGRES_URL environment variable is not set")
	}
	if err := db.InitDB(POSTGRES_URL); err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}
	fmt.Println("Database initialized successfully")

	// Create a new router
	r := mux.NewRouter()

	// Apply routes with CORS and Auth middleware

	// Public Routes
	r.HandleFunc("/api/generalData", middleware.CorsMiddleware(api.GetGeneralDataHandler)).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/operatingTimes", middleware.CorsMiddleware(api.GetLocationOperatingTimesHandler)).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/unsubscribe", middleware.CorsMiddleware(api.HandleUnsubscribe)).Methods("GET", "OPTIONS")

	// Authenticated User Routes
	r.HandleFunc("/api/allData", middleware.CorsMiddleware(middleware.AuthMiddleware(api.GetAllDataHandler))).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/userPreferences", middleware.CorsMiddleware(middleware.AuthMiddleware(api.SetUserPreferences))).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/mailing", middleware.CorsMiddleware(middleware.AuthMiddleware(api.SetUserMailing))).Methods("POST", "OPTIONS")

	// Scraper Routes Admin Cloudflare
	r.HandleFunc("/api/scrapeDailyItems", middleware.CorsMiddleware(api.ScrapeDailyItemsHandler)).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/scrapeWeeklyItems", middleware.CorsMiddleware(api.ScrapeWeeklyItemsHandler)).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/updateWeeklyItems", middleware.CorsMiddleware(api.ScrapeUpdateWeekly)).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/scrapeOperatingTimes", middleware.CorsMiddleware(api.ScrapeLocationOperatingTimesHandler)).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/sendMailing", middleware.CorsMiddleware(api.SendOutMailing)).Methods("GET", "OPTIONS")

	// Start server
	fmt.Println("Server started on port 8081")
	log.Fatal(http.ListenAndServe(":8081", r))
}
