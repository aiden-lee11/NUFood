package main

import (
	"backend/internal/api"
	"backend/internal/auth"
	"backend/internal/db"
	"backend/internal/middleware"
	"fmt"
	"github.com/joho/godotenv"
	"log"
	"net/http"
	"os"
)

func main() {
	// Load .env file only if not in production
	if os.Getenv("RENDER") != "true" && os.Getenv("RAILWAY") != "true" {
		env_err := godotenv.Load()
		if env_err != nil {
			log.Printf("Error loading .env file: %v", env_err)
		}
	}

	if err := auth.InitFirebase(); err != nil {
		log.Fatalf("Error initializing Firebase: %v", err)
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

	// Define API routes

	// Response Data
	http.HandleFunc("GET /api/allData", middleware.CorsMiddleware(middleware.AuthMiddleware(api.GetAllDataHandler)))
	http.HandleFunc("OPTIONS /api/allData", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	http.HandleFunc("GET /api/generalData", middleware.CorsMiddleware(api.GetGeneralDataHandler))
	http.HandleFunc("OPTIONS /api/generalData", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	http.HandleFunc("GET /api/operatingTimes", middleware.CorsMiddleware(api.GetLocationOperatingTimesHandler))
	http.HandleFunc("OPTIONS /api/operatingTimes", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	// Post and response with new data
	http.HandleFunc("POST /api/userPreferences", middleware.CorsMiddleware(middleware.AuthMiddleware(api.SetUserPreferences)))
	http.HandleFunc("OPTIONS /api/userPreferences", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	// Post and response with new data
	http.HandleFunc("POST /api/mailing", middleware.CorsMiddleware(middleware.AuthMiddleware(api.SetUserMailing)))
	http.HandleFunc("OPTIONS /api/mailing", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	// Scrape and Save Data
	http.HandleFunc("GET /api/scrapeDailyItems", middleware.CorsMiddleware(api.ScrapeDailyItemsHandler))
	http.HandleFunc("OPTIONS /api/scrapeDailyItems", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	http.HandleFunc("GET /api/scrapeWeeklyItems", middleware.CorsMiddleware(api.ScrapeWeeklyItemsHandler))
	http.HandleFunc("OPTIONS /api/scrapeWeeklyItems", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	http.HandleFunc("GET /api/updateWeeklyItems", middleware.CorsMiddleware(api.ScrapeUpdateWeekly))
	http.HandleFunc("OPTIONS /api/updateWeeklyItems", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	http.HandleFunc("GET /api/scrapeOperatingTimes", middleware.CorsMiddleware(api.ScrapeLocationOperatingTimesHandler))
	http.HandleFunc("OPTIONS /api/scrapeOperatingTimes", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	http.HandleFunc("GET /api/sendMailing", middleware.CorsMiddleware(middleware.AdminMiddleware(api.SendOutMailing)))
	http.HandleFunc("OPTIONS /api/sendMailing", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	http.HandleFunc("GET /api/unsubscribe", middleware.CorsMiddleware(api.HandleUnsubscribe))
	http.HandleFunc("OPTIONS /api/unsubscribe", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	http.HandleFunc("GET /api/allDailyItems", middleware.CorsMiddleware(api.GetAllDailyItemsHandler))
	http.HandleFunc("OPTIONS /api/allDailyItems", middleware.CorsMiddleware(func(w http.ResponseWriter, r *http.Request) {}))

	// Start the HTTP server on port 8080
	http.ListenAndServe(":8081", nil)
	fmt.Println("Server started on port 8081")
}
