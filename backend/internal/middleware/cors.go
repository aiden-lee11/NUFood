// middleware/cors.go
package middleware

import (
	"backend/internal/auth"
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

// ContextKey is a custom type for context keys to avoid collisions
type ContextKey string

const (
	UserIDKey ContextKey = "userID"
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

// allowedOrigins is the set of browser origins permitted to call the API.
// dining.nu is the canonical domain; the nufood.me entries are kept so the old
// domain keeps working during the redirect cutover and can be removed once the
// migration is complete.
var allowedOrigins = map[string]bool{
	"http://localhost:5173": true,
	"https://dining.nu":     true,
	"https://www.dining.nu": true,
	"https://nufood.me":     true,
	"https://www.nufood.me": true,
}

// CorsMiddleware handles CORS headers and preflight requests
func CorsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		fmt.Println("Origin: ", origin)
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "Authorization, Content-Type, Content-Length")

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
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
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

		if authHeader == "" {
			SendJSONError(w, "Missing Authorization header", http.StatusUnauthorized)
			return
		}

		// Parse the Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			SendJSONError(w, "Invalid Authorization header format", http.StatusUnauthorized)
			return
		}

		adminToken := parts[1]
		if adminToken != os.Getenv("ADMIN_TOKEN") {
			SendJSONError(w, "Provided token does not have admin permission", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

// ScrapeMiddleware protects expensive scrape jobs with a dedicated bearer
// token suitable for cron services.
func ScrapeMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			next(w, r)
			return
		}

		expectedToken := strings.TrimSpace(os.Getenv("SCRAPE_TOKEN"))
		if expectedToken == "" {
			SendJSONError(w, "Scrape endpoint is not configured", http.StatusServiceUnavailable)
			return
		}

		const prefix = "Bearer "
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, prefix) {
			SendJSONError(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
			return
		}

		providedToken := strings.TrimSpace(strings.TrimPrefix(authHeader, prefix))
		if subtle.ConstantTimeCompare([]byte(providedToken), []byte(expectedToken)) != 1 {
			SendJSONError(w, "Invalid scrape token", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}
