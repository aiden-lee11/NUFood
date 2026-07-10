package scraper_test

import (
	"backend/internal/db"
	"backend/internal/models"
	"backend/internal/scraper"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestLiveScrapePersistsAndReadsBack(t *testing.T) {
	if os.Getenv("SCRAPER_LIVE_TEST") != "1" {
		t.Skip("set SCRAPER_LIVE_TEST=1 to run the live end-to-end scraper test")
	}

	date := os.Getenv("SCRAPER_LIVE_DATE")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	testDB, err := gorm.Open(sqlite.Open("file:scraper-e2e?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.Migrate(testDB))
	db.DB = testDB

	browserScraper := scraper.NewBrowserAPIScraper()
	browserScraper.Locations = browserScraper.Locations[:1]
	browserScraper.MaxRetries = 1

	dailyItems, allDataItems, _, err := browserScraper.ScrapeFood(date)
	require.NoError(t, err)
	require.NotEmpty(t, dailyItems)

	weeklyItems := make([]models.WeeklyItem, 0, len(dailyItems))
	for _, item := range dailyItems {
		weeklyItems = append(weeklyItems, models.WeeklyItem{DailyItem: item})
	}
	scrapeDate, err := time.Parse("2006-01-02", date)
	require.NoError(t, err)
	require.NoError(t, db.PersistScrapedMenu(
		weeklyItems,
		allDataItems,
		[]string{date},
		scrapeDate,
	))

	storedItems, err := db.GetAllWeeklyItems()
	require.NoError(t, err)
	require.Len(t, storedItems[date], len(dailyItems))

	storedAllData, err := db.GetAllDataItems()
	require.NoError(t, err)
	require.NotEmpty(t, storedAllData)
}
