package twilio

import (
	"backend/internal/auth"
	"backend/internal/db"
	"backend/internal/models"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

func SendEmails() error {
	preferencesData, err := db.GetMailingList()

	if err != nil {
		log.Fatal("Error selecting all preferences in twilio attempt: ", err)
		return err
	}

	apiKey := os.Getenv("SENDGRID_API_KEY")
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
		htmlContent, err := FormatPreferences(preferences)
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

func FormatPreferences(preferences []models.DailyItem) (string, error) {
	// Map to organize items by dining hall
	categories := make(map[string][]models.DailyItem)

	// Populate the map
	for _, item := range preferences {
		categories[item.Location] = append(categories[item.Location], item)
	}

	// Helper function to sort items by time of day
	sortByTimeOfDay := func(items []models.DailyItem) []models.DailyItem {
		// Define the desired order
		timeOrder := map[string]int{
			"Breakfast": 1,
			"Lunch":     2,
			"Dinner":    3,
		}

		// Sort items in place
		sort.SliceStable(items, func(i, j int) bool {
			return timeOrder[items[i].TimeOfDay] < timeOrder[items[j].TimeOfDay]
		})
		return items
	}

	// Start building the HTML string
	var htmlBuilder strings.Builder
	htmlBuilder.WriteString("<html>\n<body>\n")

	// Iterate through dining halls
	for location, items := range categories {
		// Sort items by time of day
		items = sortByTimeOfDay(items)

		// Add dining hall as a section
		htmlBuilder.WriteString(fmt.Sprintf("<h2>%s</h2>\n<ul>\n", location))

		// Add items for the dining hall
		for _, item := range items {
			htmlBuilder.WriteString(fmt.Sprintf("<li>%s for %s</li>\n", item.Name, strings.ToLower(item.TimeOfDay)))
		}

		htmlBuilder.WriteString("</ul>\n")
	}

	htmlBuilder.WriteString("</body>\n</html>")

	return htmlBuilder.String(), nil
}
