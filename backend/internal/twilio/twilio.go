package twilio

import (
	"backend/internal/auth"
	"backend/internal/db"
	"backend/internal/models"
	"fmt"
	"log"
	"net/url"
	"os"
	"sort"
	"strings"

	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"github.com/joho/godotenv"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

func GenerateUnsubscribeToken(userID string) (string, error) {
	// Create a unique token using userID and a secret key
	env_err := godotenv.Load()
	if env_err != nil {
		log.Printf("Error loading .env file: %v", env_err)
	}

	h := hmac.New(sha256.New, []byte(os.Getenv("SECRET_KEY")))
	h.Write([]byte(userID))
	token := hex.EncodeToString(h.Sum(nil))
	return token, nil
}

func SendEmails() error {
	preferencesData, err := db.GetMailingList()

	if err != nil {
		log.Fatal("Error selecting all preferences in twilio attempt: ", err)
		return err
	}

	env_err := godotenv.Load()
	if env_err != nil {
		log.Printf("Error loading .env file: %v", env_err)
	}

	apiKey := os.Getenv("SENDGRID_API_KEY")
	baseURL := os.Getenv("BASE_URL")
	from := mail.NewEmail("NUFood", "nufoodfinder11@gmail.com")
	subject := "Available Favorites Today"

	for _, userData := range preferencesData {
		userID := userData.UserID
		preferences := userData.Preferences

		email, err := auth.GetEmailFromUID(userID)

		if err != nil {
			log.Println("An error occurred:", err)
			return err
		}

		name := strings.Split(email, "@")[0]
		to := mail.NewEmail(name, email)

		plainText := "Today's Favorites"

		unsubscribeToken, err := GenerateUnsubscribeToken(userID)
		if err != nil {
			return err
		}
		unsubscribeURL := fmt.Sprintf("%s/api/unsubscribe?user=%s&token=%s",
			baseURL, url.QueryEscape(userID), url.QueryEscape(unsubscribeToken))

		htmlContent, err := FormatPreferences(preferences, unsubscribeURL)
		if err != nil {
			// TODO for now if we see an error we just skip the user should prob implement retry
			log.Println(err)
			continue
		}

		message := mail.NewSingleEmail(from, subject, to, plainText, htmlContent)
		client := sendgrid.NewSendClient(apiKey)
		response, err := client.Send(message)
		if err != nil {
			log.Println(err)
		} else {
			fmt.Println(response.StatusCode)
			fmt.Println(response.Body)
			fmt.Println(response.Headers)
		}

	}
	return nil

}

func FormatPreferences(preferences []models.DailyItem, unsubscribeURL string) (string, error) {
	// Organize items by dining hall
	fmt.Printf("preferences: %v\n", preferences)
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
	// Iterate through each dining hall
	for location, items := range categories {
		items = sortByTimeOfDay(items)
		htmlBuilder.WriteString(fmt.Sprintf("<h2>%s</h2>\n<ul>\n", location))
		for _, item := range items {
			htmlBuilder.WriteString(fmt.Sprintf("<li><strong>%s</strong> <span class=\"time-label\">for %s</span></li>\n", item.Name, item.TimeOfDay))
		}
		htmlBuilder.WriteString("</ul>\n")
	}

	htmlBuilder.WriteString(`  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 12px;">
    <p>If you no longer wish to receive these emails, <a href="`)
	htmlBuilder.WriteString(unsubscribeURL)
	htmlBuilder.WriteString(`">click here to unsubscribe</a>.</p>
  </div>`)

	// Close the container and HTML tags
	htmlBuilder.WriteString(`  </div>
</body>
</html>`)

	return htmlBuilder.String(), nil
}
