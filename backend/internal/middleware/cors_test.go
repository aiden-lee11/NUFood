package middleware_test

import (
	"backend/internal/middleware"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestScrapeMiddleware(t *testing.T) {
	t.Setenv("SCRAPE_TOKEN", "expected-token")
	handler := middleware.ScrapeMiddleware(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	tests := []struct {
		name   string
		token  string
		status int
	}{
		{name: "missing", status: http.StatusUnauthorized},
		{name: "wrong", token: "Bearer wrong-token", status: http.StatusUnauthorized},
		{name: "valid", token: "Bearer expected-token", status: http.StatusNoContent},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/scrapeWeeklyItems", nil)
			request.Header.Set("Authorization", test.token)
			response := httptest.NewRecorder()

			handler(response, request)

			assert.Equal(t, test.status, response.Code)
		})
	}
}

func TestScrapeMiddlewareRequiresConfiguration(t *testing.T) {
	t.Setenv("SCRAPE_TOKEN", "")
	handler := middleware.ScrapeMiddleware(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodPost, "/api/scrapeWeeklyItems", nil)
	request.Header.Set("Authorization", "Bearer any-token")
	response := httptest.NewRecorder()

	handler(response, request)

	assert.Equal(t, http.StatusServiceUnavailable, response.Code)
}
