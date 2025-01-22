package twilio

import (
	"backend/internal/auth"
	"backend/internal/db"
	"fmt"
	"log"
	"os"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

func SendEmails() {
	preferencesData, err := db.GetAllUsersAndPreferences()

	if err != nil {
		log.Fatal("Error selecting all preferences in twilio attempt: ", err)
	}

	for _, userData := range preferencesData {
		user_id := userData.UserID
		preferences := userData.Preferences

		email, err := auth.GetEmailFromUID(user_id)

		if err != nil {
			log.Println("An error occurred:", err)
		}

		apiKey := os.Getenv("SENDGRID_API_KEY")
		from := mail.NewEmail("NUFood", "nufoodfinder11@gmail.com")
		subject := "Available Favorites Today"
		to := mail.NewEmail("Test", "aidenlee2027@u.northwestern.edu")
		plainTextContent := "and easy to do anywhere, even with Go"
		htmlContent := "<strong>and easy to do anywhere, even with Go</strong>"
		message := mail.NewSingleEmail(from, subject, to, plainTextContent, htmlContent)
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

}
