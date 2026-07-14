package twilio

import (
	"backend/internal/auth"
	"backend/internal/db"
	"backend/internal/models"
	"fmt"
	"html"
	"log"
	"net/url"
	"os"
	"sort"
	"strings"

	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

func GenerateUnsubscribeToken(userID string) (string, error) {
	secret := os.Getenv("SECRET_KEY")
	if secret == "" {
		return "", fmt.Errorf("SECRET_KEY is required")
	}

	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(userID))
	token := hex.EncodeToString(h.Sum(nil))
	return token, nil
}

// ValidateUnsubscribeToken reports whether token is the valid unsubscribe token
// for userID, using a constant-time comparison to avoid leaking the expected
// token through timing. The error is non-nil only when the token can't be
// computed at all (e.g. SECRET_KEY unset).
func ValidateUnsubscribeToken(userID, token string) (bool, error) {
	expected, err := GenerateUnsubscribeToken(userID)
	if err != nil {
		return false, err
	}
	return hmac.Equal([]byte(token), []byte(expected)), nil
}

func SendEmails() error {
	preferencesData, err := db.GetMailingList()

	if err != nil {
		return fmt.Errorf("select mailing preferences: %w", err)
	}

	apiKey := os.Getenv("SENDGRID_API_KEY")
	baseURL := os.Getenv("BASE_URL")
	if apiKey == "" {
		return fmt.Errorf("SENDGRID_API_KEY is required")
	}
	if baseURL == "" {
		return fmt.Errorf("BASE_URL is required")
	}

	from := mail.NewEmail("NUFood", "nufoodfinder11@gmail.com")
	subject := "Available Favorites Today"
	client := sendgrid.NewSendClient(apiKey)

	// A single bad recipient (e.g. a deleted Firebase user still in the DB, or a
	// transient SendGrid error) must not abort the whole run — every user is
	// attempted, per-user failures are logged and counted, and a summary error
	// is returned only after everyone has been tried.
	var sent, failed int
	for _, userData := range preferencesData {
		userID := userData.UserID
		preferences := userData.Preferences

		email, err := auth.GetEmailFromUID(userID)
		if err != nil {
			log.Printf("mailing: skip user %s: resolve email: %v", userID, err)
			failed++
			continue
		}

		name := strings.Split(email, "@")[0]
		to := mail.NewEmail(name, email)

		plainText := "Today's Favorites"

		unsubscribeToken, err := GenerateUnsubscribeToken(userID)
		if err != nil {
			// SECRET_KEY missing is a config problem affecting everyone; stop now.
			return fmt.Errorf("mailing: generate unsubscribe token: %w", err)
		}
		unsubscribeURL := fmt.Sprintf("%s/api/unsubscribe?user=%s&token=%s",
			baseURL, url.QueryEscape(userID), url.QueryEscape(unsubscribeToken))

		htmlContent, err := FormatPreferences(preferences, unsubscribeURL)
		if err != nil {
			log.Printf("mailing: skip user %s: format preferences: %v", userID, err)
			failed++
			continue
		}

		message := mail.NewSingleEmail(from, subject, to, plainText, htmlContent)
		response, err := client.Send(message)
		if err != nil {
			log.Printf("mailing: skip user %s: send: %v", userID, err)
			failed++
			continue
		}
		if response.StatusCode < 200 || response.StatusCode >= 300 {
			log.Printf("mailing: skip user %s: sendgrid status=%d body=%s",
				userID, response.StatusCode, response.Body)
			failed++
			continue
		}
		sent++
	}

	log.Printf("mailing: complete (%d sent, %d failed of %d)", sent, failed, len(preferencesData))
	if failed > 0 {
		return fmt.Errorf("mailing: %d of %d recipients failed (see logs)", failed, len(preferencesData))
	}
	return nil
}

func FormatPreferences(preferences []models.DailyItem, unsubscribeURL string) (string, error) {
	// Organize items by dining hall
	categories := make(map[string][]models.DailyItem)
	for _, item := range preferences {
		categories[item.Location] = append(categories[item.Location], item)
	}

	// Helper function to sort items by time of day
	sortByTimeOfDay := func(items []models.DailyItem) []models.DailyItem {
		timeOrder := map[string]int{
			"Breakfast": 1,
			"Lunch":     2,
			"Dinner":    3,
		}
		sort.SliceStable(items, func(i, j int) bool {
			return timeOrder[items[i].TimeOfDay] < timeOrder[items[j].TimeOfDay]
		})
		return items
	}

	var htmlBuilder strings.Builder
	// Start building a full HTML document with head, meta, and style tags
	htmlBuilder.WriteString(`<!DOCTYPE html>
				<html>
				<head>
				  <meta charset="utf-8">
				  <meta name="viewport" content="width=device-width, initial-scale=1">
				  <title>Your Daily Favorites</title>
				  <style>
				    body {
				      font-family: Arial, sans-serif;
				      background-color: #f6f6f6;
				      margin: 0;
				      padding: 20px;
				      color: #333;
				    }
				    .container {
				      max-width: 600px;
				      margin: 0 auto;
				      background-color: #fff;
				      padding: 20px;
				      border-radius: 8px;
				      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
				    }
				    h1 {
				      text-align: center;
				      color: #444;
				    }
				    h2 {
				      color: #007BFF;
				      border-bottom: 2px solid #007BFF;
				      padding-bottom: 5px;
				    }
				    ul {
				      list-style: none;
				      padding: 0;
				    }
				    li {
				      padding: 8px 0;
				      border-bottom: 1px solid #eaeaea;
				    }
				    li:last-child {
				      border-bottom: none;
				    }
				    .time-label {
				      color: #777;
				    }
				  </style>
				</head>
				<body>
				  <div class="container">
				    <h1>Your Daily Favorites</h1>
				`)
	locations := make([]string, 0, len(categories))
	for location := range categories {
		locations = append(locations, location)
	}
	sort.Strings(locations)

	// Iterate through each dining hall
	for _, location := range locations {
		items := categories[location]
		items = sortByTimeOfDay(items)
		htmlBuilder.WriteString(fmt.Sprintf("<h2>%s</h2>\n<ul>\n", html.EscapeString(location)))
		for _, item := range items {
			htmlBuilder.WriteString(fmt.Sprintf(
				"<li><strong>%s</strong> <span class=\"time-label\">for %s</span></li>\n",
				html.EscapeString(item.Name),
				html.EscapeString(item.TimeOfDay),
			))
		}
		htmlBuilder.WriteString("</ul>\n")
	}

	htmlBuilder.WriteString(`  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 12px;">
    <p>If you no longer wish to receive these emails, <a href="`)
	htmlBuilder.WriteString(html.EscapeString(unsubscribeURL))
	htmlBuilder.WriteString(`">click here to unsubscribe</a>.</p>
  </div>`)

	// Close the container and HTML tags
	htmlBuilder.WriteString(`  </div>
</body>
</html>`)

	return htmlBuilder.String(), nil
}
