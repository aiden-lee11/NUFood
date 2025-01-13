// middleware/cors.go
package middleware

import (
	"backend/internal/auth"
	"context"
	"fmt"
	"net/http"
)

// CorsMiddleware handles CORS headers and preflight requests
func CorsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	fmt.Println("CORS Middleware")
	return func(w http.ResponseWriter, r *http.Request) {
		// Always set CORS headers first
		origin := r.Header.Get("Origin")
		fmt.Println("Origin: ", origin)
		if origin == "http://localhost:5173" || origin == "https://www.nufood.me" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "Authorization")

		// Handle preflight
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// AuthMiddleware handles Firebase authentication
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		token, err := auth.VerifyIDToken(authHeader)
		if err != nil {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Extract user ID from token claims
		userID := token.UID
		if userID == "" {
			http.Error(w, "UserID not found in token", http.StatusBadRequest)
			return
		}

		// Add userID to request context
		ctx := context.WithValue(r.Context(), "userID", userID)
		next(w, r.WithContext(ctx))
	}
}
