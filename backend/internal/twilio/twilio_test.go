package twilio_test

import (
	"backend/internal/models"
	"backend/internal/twilio"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFormatPreferencesForEmail(t *testing.T) {
	preferences := []models.DailyItem{
		{Name: "Pancakes", Location: "Allison", TimeOfDay: "Breakfast"},
		{Name: "Pasta", Location: "Allison", TimeOfDay: "Dinner"},
		{Name: "Tacos", Location: "Sargent", TimeOfDay: "Lunch"},
	}

	html, err := twilio.FormatPreferences(preferences, "https://example.test/unsubscribe")
	require.NoError(t, err)
	assert.Contains(t, html, "Allison")
	assert.Contains(t, html, "Sargent")
	assert.Less(t, strings.Index(html, "Pancakes"), strings.Index(html, "Pasta"))
	assert.Contains(t, html, "https://example.test/unsubscribe")
}

func TestGenerateUnsubscribeToken(t *testing.T) {
	t.Setenv("SECRET_KEY", "test-secret")

	first, err := twilio.GenerateUnsubscribeToken("user-123")
	require.NoError(t, err)
	second, err := twilio.GenerateUnsubscribeToken("user-123")
	require.NoError(t, err)

	assert.NotEmpty(t, first)
	assert.Equal(t, first, second)
}

func TestGenerateUnsubscribeTokenRequiresSecret(t *testing.T) {
	t.Setenv("SECRET_KEY", "")

	token, err := twilio.GenerateUnsubscribeToken("user-123")

	assert.Error(t, err)
	assert.Empty(t, token)
}

func TestFormatPreferencesEscapesUserFacingValues(t *testing.T) {
	preferences := []models.DailyItem{{
		Name:      "<script>alert('x')</script>",
		Location:  "Hall & Cafe",
		TimeOfDay: "Lunch",
	}}

	content, err := twilio.FormatPreferences(preferences, "https://example.test/?a=1&b=2")
	require.NoError(t, err)

	assert.NotContains(t, content, "<script>")
	assert.Contains(t, content, "&lt;script&gt;")
	assert.Contains(t, content, "Hall &amp; Cafe")
	assert.Contains(t, content, "a=1&amp;b=2")
}
