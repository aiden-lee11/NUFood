package twilio_test

import (
	"backend/internal/twilio"
	"testing"
)

func TestTwilio(t *testing.T) {
	twilio.SendEmails()
}
