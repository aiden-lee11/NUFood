// middleware/cors.go
package middleware

import (
	"backend/internal/auth"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// Custom JSON error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Status  int    `json:"status"`
	Message string `json:"message"`
}

// SendJSONError sends a consistent JSON error response
func SendJSONError(w http.ResponseWriter, message string, status int) {
	response := ErrorResponse{
		Error:   http.StatusText(status),
		Status:  status,
		Message: message,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}

// CorsMiddleware handles CORS headers and preflight requests
func CorsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		fmt.Println("Origin: ", origin)
		if origin == "http://localhost:5173" || origin == "https://www.nufood.me" || origin == "https://www.dineon.nu" {
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

		next.ServeHTTP(w, r)
	})
}

// AuthMiddleware handles Firebase authentication
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")

		// Skip auth check for OPTIONS requests
		if r.Method == http.MethodOptions {
			next(w, r)
			return
		}

		token, err := auth.VerifyIDToken(authHeader)
		if err != nil {
			SendJSONError(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Extract user ID from token claims
		userID := token.UID
		if userID == "" {
			SendJSONError(w, "UserID not found in token", http.StatusBadRequest)
			return
		}

		// Add userID to request context
		ctx := context.WithValue(r.Context(), "userID", userID)
		next(w, r.WithContext(ctx))
	}
}

// AdminMiddleware verifies the request has admin privileges
func AdminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Skip auth check for OPTIONS requests
		if r.Method == http.MethodOptions {
			next(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")

		if authHeader != os.Getenv("ADMIN_TOKEN") {
			SendJSONError(w, "Provided token does not have admin permission", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}
