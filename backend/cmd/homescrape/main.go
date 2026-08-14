// Command homescrape collects dining menus using a local Chrome instance and
// writes them to the database, then asks the backend to refresh its in-memory
// store. It runs on an always-on Mac and updates menus a few times a day, ahead
// of each meal.
package main

import (
	"backend/internal/db"
	"backend/internal/models"
	"backend/internal/scraper"
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

const (
	debugPort   = "9222"
	centralTZ   = "America/Chicago"
	sessionSpan = 12 * time.Minute // safety bound per scrape session
)

// mealWindow is the local-Central time span within which a meal's daily update
// runs, at a random moment inside the window, ahead of that meal's service.
type mealWindow struct {
	meal            string
	startHour, endH int
	startMin, endM  int
}

var windows = []mealWindow{
	{"Breakfast", 6, 0, 6, 40},
	{"Lunch", 10, 15, 10, 50},
	{"Dinner", 16, 0, 16, 40},
}

type config struct {
	postgresURL string
	backendURL  string
	scrapeToken string
	chromePath  string
	profileDir  string
	daysAhead   int
}

func loadConfig() config {
	home, _ := os.UserHomeDir()
	c := config{
		postgresURL: os.Getenv("POSTGRES_URL"),
		backendURL:  envOr("BACKEND_URL", "https://nufoodfinder-prod.up.railway.app"),
		scrapeToken: os.Getenv("SCRAPE_TOKEN"),
		chromePath:  envOr("CHROME_PATH", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
		profileDir:  envOr("CHROME_PROFILE", home+"/.nufood-chrome"),
		daysAhead:   2,
	}
	return c
}

func envOr(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}

func main() {
	var once string
	flag.StringVar(&once, "once", "", "run a single meal now and exit (Breakfast|Lunch|Dinner) — for testing")
	dry := flag.Bool("dry", false, "with -once: scrape and print, do NOT write to the database")
	flag.Parse()

	cfg := loadConfig()
	if cfg.postgresURL == "" {
		log.Fatal("POSTGRES_URL is required")
	}
	if !*dry && cfg.scrapeToken == "" {
		log.Println("warning: SCRAPE_TOKEN unset — the backend store-refresh ping will be skipped")
	}
	if err := db.InitDB(cfg.postgresURL); err != nil {
		log.Fatalf("init db: %v", err)
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	if once != "" {
		meal := normalizeMeal(once)
		if meal == "" {
			log.Fatalf("invalid -once meal %q", once)
		}
		runSession(cfg, rng, meal, *dry)
		return
	}

	runDaemon(cfg, rng)
}

// runDaemon computes three randomized session times per day and runs each in
// turn, forever.
func runDaemon(cfg config, rng *rand.Rand) {
	loc, err := time.LoadLocation(centralTZ)
	if err != nil {
		log.Fatalf("load %s: %v", centralTZ, err)
	}
	log.Printf("homescrape daemon started; scraping %d days ahead, 3 randomized sessions/day (Central)", cfg.daysAhead)

	var dayKey string
	var plan []*session
	for {
		now := time.Now().In(loc)
		if key := now.Format("2006-01-02"); key != dayKey {
			dayKey = key
			plan = planDay(now, loc, rng)
			for _, s := range plan {
				log.Printf("scheduled %s scrape at %s", s.meal, s.fire.Format("15:04 MST"))
			}
		}

		next := nextPending(plan, now)
		if next == nil {
			// Nothing left today; wake just after midnight to replan.
			tomorrow := time.Date(now.Year(), now.Month(), now.Day(), 0, 5, 0, 0, loc).Add(24 * time.Hour)
			sleepUntil(tomorrow)
			continue
		}
		sleepUntil(next.fire)
		runSession(cfg, rng, next.meal, false)
		next.done = true
	}
}

type session struct {
	meal string
	fire time.Time
	done bool
}

func planDay(now time.Time, loc *time.Location, rng *rand.Rand) []*session {
	var out []*session
	for _, w := range windows {
		start := time.Date(now.Year(), now.Month(), now.Day(), w.startHour, w.startMin, 0, 0, loc)
		end := time.Date(now.Year(), now.Month(), now.Day(), w.endH, w.endM, 0, 0, loc)
		span := int(end.Sub(start).Seconds())
		fire := start.Add(time.Duration(rng.Intn(span)) * time.Second)
		out = append(out, &session{meal: w.meal, fire: fire})
	}
	return out
}

// nextPending returns the earliest not-yet-run session whose fire time is in the
// future (or within the last 10 minutes, so a session isn't skipped if the
// daemon woke slightly late).
func nextPending(plan []*session, now time.Time) *session {
	var best *session
	for _, s := range plan {
		if s.done || now.Sub(s.fire) > 10*time.Minute {
			continue
		}
		if best == nil || s.fire.Before(best.fire) {
			best = s
		}
	}
	return best
}

func sleepUntil(t time.Time) {
	d := time.Until(t)
	if d > 0 {
		time.Sleep(d)
	}
}

// runSession collects one meal across all halls for today..today+daysAhead,
// writes the results, and refreshes the backend store.
func runSession(cfg config, rng *rand.Rand, meal string, dry bool) {
	loc, _ := time.LoadLocation(centralTZ)
	now := time.Now().In(loc)
	dates := make([]string, 0, cfg.daysAhead+1)
	for d := 0; d <= cfg.daysAhead; d++ {
		dates = append(dates, now.AddDate(0, 0, d).Format("2006-01-02"))
	}

	wsURL, err := ensureChrome(cfg)
	if err != nil {
		log.Printf("[%s] chrome unavailable: %v", meal, err)
		return
	}

	s := scraper.NewSiteScraper(wsURL)
	ctx, cancel := context.WithTimeout(context.Background(), sessionSpan)
	defer cancel()

	// Brief randomized delay between requests.
	pause := func() {
		time.Sleep(time.Duration(4000+rng.Intn(14000)) * time.Millisecond)
	}

	results, err := s.ScrapeSession(ctx, dates, meal, rng, pause)
	if err != nil {
		log.Printf("[%s] session failed: %v", meal, err)
		return
	}

	periods, items, all, matched, failed := buildPlan(meal, results)
	log.Printf("[%s] dates=%v halls_with_menu=%d items=%d failures=%d", meal, dates, matched, len(items), failed)

	if dry {
		for _, r := range results {
			if r.Err == nil && r.Matched && len(r.DailyItems) > 0 {
				log.Printf("  %s %s: %d items (e.g. %s)", r.Date, r.Location, len(r.DailyItems), r.DailyItems[0].Name)
			}
		}
		return
	}
	if len(periods) == 0 {
		log.Printf("[%s] nothing to write (no hall returned a menu); leaving stored data untouched", meal)
		return
	}
	if err := db.ReplaceMenuPeriods(periods, items, all); err != nil {
		log.Printf("[%s] db write failed: %v", meal, err)
		return
	}
	if err := pingReload(cfg); err != nil {
		log.Printf("[%s] wrote DB but store-refresh ping failed: %v", meal, err)
		return
	}
	log.Printf("[%s] wrote %d slices and refreshed the app", meal, len(periods))
}

// buildPlan turns results into the DB write, applying the same safety rules as
// the backend's period refresh: only halls whose fetch succeeded AND returned
// items are written; a failed or empty fetch is omitted so its stored rows are
// preserved rather than wiped.
func buildPlan(meal string, results []scraper.MealResult) (periods []db.MenuPeriod, items []models.WeeklyItem, all []models.AllDataItem, matched, failed int) {
	seen := map[string]struct{}{}
	addPeriod := func(p db.MenuPeriod) {
		k := p.Date + "\x00" + p.Location + "\x00" + p.TimeOfDay
		if _, ok := seen[k]; ok {
			return
		}
		seen[k] = struct{}{}
		periods = append(periods, p)
	}
	for _, r := range results {
		if r.Err != nil {
			failed++
			continue
		}
		if !r.Matched || len(r.DailyItems) == 0 {
			continue // not serving, or empty+unverified: preserve existing rows
		}
		matched++
		addPeriod(db.MenuPeriod{Date: r.Date, Location: r.Location, TimeOfDay: meal})
		if r.MatchedPeriod != "" && !strings.EqualFold(r.MatchedPeriod, meal) {
			addPeriod(db.MenuPeriod{Date: r.Date, Location: r.Location, TimeOfDay: r.MatchedPeriod})
		}
		for _, it := range r.DailyItems {
			items = append(items, models.WeeklyItem{DailyItem: it})
		}
		all = append(all, r.AllItems...)
	}
	return periods, items, all, matched, failed
}

func normalizeMeal(m string) string {
	switch strings.ToLower(strings.TrimSpace(m)) {
	case "breakfast":
		return "Breakfast"
	case "lunch":
		return "Lunch"
	case "dinner":
		return "Dinner"
	default:
		return ""
	}
}

// pingReload asks the backend to reload its in-memory store from the DB.
func pingReload(cfg config) error {
	if cfg.scrapeToken == "" {
		return nil
	}
	req, err := http.NewRequest("POST", strings.TrimRight(cfg.backendURL, "/")+"/api/reloadMenuStore", bytes.NewReader([]byte("{}")))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.scrapeToken)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("reload returned HTTP %d", resp.StatusCode)
	}
	return nil
}

// ensureChrome returns the DevTools websocket URL of a running Chrome, starting
// one with a dedicated profile if it isn't already up.
func ensureChrome(cfg config) (string, error) {
	if ws := chromeWS(); ws != "" {
		return ws, nil
	}
	// Launch and detach; it stays up for subsequent sessions.
	cmd := exec.Command(cfg.chromePath,
		"--remote-debugging-port="+debugPort,
		"--remote-allow-origins=*",
		"--user-data-dir="+cfg.profileDir,
		"--no-first-run",
		"--no-default-browser-check",
		"--window-position=-3000,-3000",
		"--window-size=1200,900",
		"about:blank",
	)
	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("launch chrome: %w", err)
	}
	for i := 0; i < 15; i++ {
		time.Sleep(1 * time.Second)
		if ws := chromeWS(); ws != "" {
			return ws, nil
		}
	}
	return "", fmt.Errorf("chrome debug port did not come up")
}

func chromeWS() string {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://localhost:" + debugPort + "/json/version")
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	var v struct {
		WebSocketDebuggerURL string `json:"webSocketDebuggerUrl"`
	}
	if json.NewDecoder(resp.Body).Decode(&v) != nil {
		return ""
	}
	return v.WebSocketDebuggerURL
}
