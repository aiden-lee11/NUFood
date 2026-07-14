package scheduler

import (
	"backend/internal/twilio"
	"log"
	"os"
	"strings"
	"time"

	// Embed the timezone database so LoadLocation(campusZone) works even on
	// minimal container images that ship no system tzdata.
	_ "time/tzdata"
)

// defaultMailingHours: a single 7am Central send catches the finalized menu for
// the day and lands in inboxes before breakfast ("start of each day").
var defaultMailingHours = []int{7}

// StartDailyMailing launches the background "daily favorites" email loop unless
// disabled via ENABLE_MAILING_CRON=false. Send times are MAILING_HOURS_CST
// (comma-separated hours 0-23 in America/Chicago, default "7"). It mirrors
// StartDailyScrape: one goroutine that sleeps until the next scheduled time and
// calls twilio.SendEmails. Failures are logged, never fatal.
func StartDailyMailing() {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("ENABLE_MAILING_CRON")), "false") {
		log.Println("daily mailing disabled via ENABLE_MAILING_CRON=false")
		return
	}

	loc, err := time.LoadLocation(campusZone)
	if err != nil {
		log.Printf("failed to load timezone %q (%v); mailing cron disabled", campusZone, err)
		return
	}

	hours := parseHoursEnv("MAILING_HOURS_CST", defaultMailingHours)
	go func() {
		for {
			next := nextRun(time.Now(), hours, loc)
			wait := time.Until(next)
			log.Printf("next favorites mailing at %s (in %s)", next.Format("2006-01-02 15:04 MST"), wait.Truncate(time.Second))
			time.Sleep(wait)
			runMailingOnce()
		}
	}()
}

// runMailingOnce performs a single mailing pass, isolating panics so the
// scheduler loop (and the server) survive any failure inside the send path.
func runMailingOnce() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("favorites mailing panicked: %v", r)
		}
	}()

	log.Println("favorites mailing starting")
	if err := twilio.SendEmails(); err != nil {
		log.Printf("favorites mailing failed: %v", err)
		return
	}
	log.Println("favorites mailing complete")
}
