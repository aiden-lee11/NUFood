package main

import (
	"backend/internal/api"
	"backend/internal/auth"
	"backend/internal/cache"
	"backend/internal/db"
	"backend/internal/middleware"
	"backend/internal/store"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
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

	store.InitStore()

	fmt.Println("MemoryStore initialized")

	// Initialize user cache
	// Cache user data for 8 hours, max 1000 users
	cache.InitUserCache(8*time.Hour, 1000)

	// Start background cleanup routine (runs every 10 minutes)
	cache.StartCleanupRoutine(10 * time.Minute)

	fmt.Println("UserCache initialized")

	// Create a new router
	r := mux.NewRouter()

	// API routes
	apiRouter := r.PathPrefix("/api").Subrouter()

	// Define handlers with appropriate middleware wrappers
	// Convert http.HandlerFunc to http.Handler as needed for Gorilla Mux

	// Response Data endpoints
	apiRouter.HandleFunc("/allData", middleware.AuthMiddleware(api.GetAllDataHandler)).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/generalData", api.GetGeneralDataHandler).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/operatingTimes", api.GetLocationOperatingTimesHandler).Methods("GET", "OPTIONS")

	// User preferences endpoints
	apiRouter.HandleFunc("/userPreferences", middleware.AuthMiddleware(api.SetUserPreferences)).Methods("POST", "OPTIONS")
	apiRouter.HandleFunc("/mailing", middleware.AuthMiddleware(api.SetUserMailing)).Methods("POST", "OPTIONS")

	// Scrape and Save Data endpoints
	apiRouter.HandleFunc("/scrapeWeeklyItems", api.ScrapeWeeklyItemsHandler).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/updateWeeklyItems", api.ScrapeUpdateWeekly).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/scrapeOperatingTimes", api.ScrapeLocationOperatingTimesHandler).Methods("GET", "OPTIONS")

	// Mailing endpoints
	apiRouter.HandleFunc("/sendMailing", middleware.AdminMiddleware(api.SendOutMailing)).Methods("GET", "OPTIONS")
	apiRouter.HandleFunc("/unsubscribe", api.HandleUnsubscribe).Methods("GET", "OPTIONS")

	// Nutrition Goals endpoints - combine both methods on the same route pattern
	nutritionGoalsRoute := apiRouter.PathPrefix("/nutritionGoals").Subrouter()
	nutritionGoalsRoute.HandleFunc("", middleware.AuthMiddleware(api.SaveNutritionGoalsHandler)).Methods("POST", "OPTIONS")
	nutritionGoalsRoute.HandleFunc("", middleware.AuthMiddleware(api.GetNutritionGoalsHandler)).Methods("GET", "OPTIONS")

	// Cache statistics endpoint (for debugging/monitoring)
	apiRouter.HandleFunc("/cache/stats", middleware.AdminMiddleware(api.GetCacheStatsHandler)).Methods("GET", "OPTIONS")

	// Apply CORS middleware to all routes
	corsRouter := middleware.CorsMiddleware(r)

	// Set up server with timeouts
	server := &http.Server{
		Addr:         ":8081",
		Handler:      corsRouter,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start the server
	fmt.Println("Server starting on port 8081")
	log.Fatal(server.ListenAndServe())
}
