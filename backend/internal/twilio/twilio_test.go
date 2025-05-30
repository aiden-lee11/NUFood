package twilio_test

import (
	"backend/internal/auth"
	"backend/internal/db"
	"backend/internal/models"
	"backend/internal/twilio"
	"fmt"
	"log"
	"os"

	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/joho/godotenv"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestFormatPreferencesForEmail(t *testing.T) {
	fmt.Println("Testing format preferences for email")
	dailyItems := []models.DailyItem{
		{
			Name:        "Bacon",
			Description: "Delicious bacon",
			Date:        "2021-09-06",
			Location:    "Sargent",
			StationName: "Comfort",
			TimeOfDay:   "Breakfast",
		},
		{
			Name:        "Eggs",
			Description: "Scrambled eggs",
			Date:        "2021-09-06",
			Location:    "Allison",
			StationName: "Comfort",
			TimeOfDay:   "Breakfast",
		},
	}
	_, err := twilio.FormatPreferences(dailyItems, "localhost")

	assert.NoError(t, err, "Error in formatting daily items")
}

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	t.Log("Setting up test database")

	// Initialize an in-memory SQLite database
	DB, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err, "Failed to initialize test database")

	// Apply migrations
	err = DB.AutoMigrate(&db.GormDailyItem{}, &db.GormAllDataItem{}, &db.GormUserPreferences{}, &db.GormLocationOperatingTimes{})
	if err != nil {
		t.Fatalf("Failed to migrate schema: %v", err)
	}

	t.Log("Test database initialized successfully")

	return DB
}

func teardownTestDB(db *gorm.DB, t *testing.T) {
	t.Helper()
	sqlDB, err := db.DB()
	require.NoError(t, err, "Failed to retrieve SQL DB from Gorm DB")
	assert.NoError(t, sqlDB.Close(), "Failed to close the test database")
}

func TestMailingList(t *testing.T) {
	t.Log("Running TestMailingList")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	tx := testDB.Begin()
	defer tx.Rollback()

	// Use this transaction for all DB operations
	// transaction is necessary here for testing not for prod just becuase the read writes to in memory sqlite can interfere with eachothers timing
	// causing a horrible "table not found" err :)
	db.DB = tx

	// Insert daily items to be looked up
	dailyItems := []models.DailyItem{
		{
			Name:        "Bacon",
			Description: "Delicious bacon",
			Date:        "2021-09-06",
			Location:    "Allison",
			StationName: "Comfort",
			TimeOfDay:   "Breakfast",
		},
		{
			Name:        "Bacon",
			Description: "Delicious bacon",
			Date:        "2021-09-06",
			Location:    "Sargent",
			StationName: "Comfort",
			TimeOfDay:   "Breakfast",
		},
		{
			Name:        "Chicken Parmesan",
			Description: "LeChicken",
			Date:        "2021-09-06",
			Location:    "Elder",
			StationName: "Comfort",
			TimeOfDay:   "Dinner",
		},
		{
			Name:        "Orange Chicken",
			Description: "LeChicken2",
			Date:        "2021-09-06",
			Location:    "Plex East",
			StationName: "Comfort",
			TimeOfDay:   "Lunch",
		},
	}

	err := db.InsertDailyItems(dailyItems, false)
	require.NoError(t, err, "Error inserting daily items")

	// Set up a user's preferences
	user1Preferences := []models.AllDataItem{
		{Name: "Bacon"},
		{Name: "Eggs"},
		{Name: "Chicken Parmesan"},
	}

	user2Preferences := []models.AllDataItem{
		{Name: "Eggs"},
		{Name: "Chicken Parmesan"},
		{Name: "Orange Chicken"},
	}

	env_err := godotenv.Load()
	if env_err != nil {
		log.Printf("Error loading .env file: %v", env_err)
	}
	user1ID := os.Getenv("TESTING_USER_ID1")
	user2ID := os.Getenv("TESTING_USER_ID2")

	if err := auth.InitFirebase(); err != nil {
		log.Fatal("Init firebase failed: ", err)
	}

	err = db.SaveUserPreferences(user1ID, user1Preferences)
	assert.NoError(t, err, "Error saving user")
	err = db.UpdateMailingStatus(user1ID, true)
	require.NoError(t, err, "Error saving user preferences")

	err = db.SaveUserPreferences(user2ID, user2Preferences)
	assert.NoError(t, err, "Error saving user")
	err = db.UpdateMailingStatus(user2ID, true)

	require.NoError(t, err, "Error saving user preferences")

	err = twilio.SendEmails()

	require.NoError(t, err, "Error sending email")
}

func TestUnsubscribe(t *testing.T) {
	t.Log("Running TestMailingList")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	tx := testDB.Begin()
	defer tx.Rollback()

	// Use this transaction for all DB operations
	// transaction is necessary here for testing not for prod just becuase the read writes to in memory sqlite can interfere with eachothers timing
	// causing a horrible "table not found" err :)
	db.DB = tx

	// Insert daily items to be looked up
	dailyItems := []models.DailyItem{
		{
			Name:        "Bacon",
			Description: "Delicious bacon",
			Date:        "2021-09-06",
			Location:    "Allison",
			StationName: "Comfort",
			TimeOfDay:   "Breakfast",
		},
		{
			Name:        "Bacon",
			Description: "Delicious bacon",
			Date:        "2021-09-06",
			Location:    "Sargent",
			StationName: "Comfort",
			TimeOfDay:   "Breakfast",
		},
		{
			Name:        "Chicken Parmesan",
			Description: "LeChicken",
			Date:        "2021-09-06",
			Location:    "Elder",
			StationName: "Comfort",
			TimeOfDay:   "Dinner",
		},
		{
			Name:        "Orange Chicken",
			Description: "LeChicken2",
			Date:        "2021-09-06",
			Location:    "Plex East",
			StationName: "Comfort",
			TimeOfDay:   "Lunch",
		},
	}

	err := db.InsertDailyItems(dailyItems, false)
	require.NoError(t, err, "Error inserting daily items")

	// Set up a user's preferences
	user1Preferences := []models.AllDataItem{
		{Name: "Bacon"},
		{Name: "Eggs"},
		{Name: "Chicken Parmesan"},
	}

	env_err := godotenv.Load()
	if env_err != nil {
		log.Printf("Error loading .env file: %v", env_err)
	}
	user1ID := os.Getenv("TESTING_USER_ID1")

	if err := auth.InitFirebase(); err != nil {
		log.Fatal("Init firebase failed: ", err)
	}

	err = db.SaveUserPreferences(user1ID, user1Preferences)
	assert.NoError(t, err, "Error saving user")
	err = db.UpdateMailingStatus(user1ID, true)
	require.NoError(t, err, "Error saving user preferences")

	err = twilio.SendEmails()

	token, err := twilio.GenerateUnsubscribeToken(user1ID)

	require.NoError(t, err, "Error generating unsub token")

	fmt.Printf("token: %v\n", token)
}
