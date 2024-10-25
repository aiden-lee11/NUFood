package db_test

import (
	"backend/internal/db"
	"backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"testing"
)

// Total functions in db.go

// func AllDataItemToGorm(item models.AllDataItem) GormAllDataItem {
// func DailyItemToGorm(item models.DailyItem) GormDailyItem {
// func InitDB(databasePath string) error {
// func InsertDailyItems(items []models.DailyItem, allClosed bool) error {
// func InsertAllDataItems(items []models.AllDataItem, allClosed bool) error {
// func InsertLocationOperatingTimes(locations []models.LocationOperatingTimes) error {
// func SaveUserPreferences(userID string, favorites []models.AllDataItem) error {
// func ReturnDateOfDailyItems() (date string, err error) {
// func GetAllDailyItems() ([]models.DailyItem, error) {
// func GetAllDataItems() ([]models.AllDataItem, error) {
// func GetLocationOperatingTimes() ([]models.LocationOperatingTimes, error) {
// func GetUserPreferences(userID string) ([]models.AllDataItem, error) {
// func FindFavoriteItemInDailyItems(favorite string) ([]models.DailyItem, error) {
// func GetAvailableFavorites(userID string) ([]models.DailyItem, error) {
// func DeleteDailyItems() error {
// func DeleteLocationOperatingTimes() error {

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

func TestLocationOperationsLifeTime(t *testing.T) {

	t.Log("Running TestInsertLocationOperations")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	db.DB = testDB

	locationOperations := []models.LocationOperatingTimes{
		{
			Name: "allison dining commons",
			Week: []models.DailyOperatingTimes{
				{
					Day:    0,
					Date:   "2021-09-06",
					Status: "open",
					Hours: []models.HourlyTimes{
						{
							StartHour:    7,
							StartMinutes: 0,
							EndHour:      20,
							EndMinutes:   0,
						},
						{
							StartHour:    9,
							StartMinutes: 30,
							EndHour:      14,
							EndMinutes:   0,
						},
					},
				},
			},
		},
		{
			Name: "sargent",
			Week: []models.DailyOperatingTimes{
				{
					Day:    0,
					Date:   "2021-09-06",
					Status: "open",
					Hours: []models.HourlyTimes{
						{
							StartHour:    8,
							StartMinutes: 0,
							EndHour:      20,
							EndMinutes:   0,
						},
						{
							StartHour:    8,
							StartMinutes: 30,
							EndHour:      14,
							EndMinutes:   0,
						},
					},
				},
			},
		},
	}

	err := db.InsertLocationOperatingTimes(locationOperations)
	require.NoError(t, err, "Error inserting location operations")

	locations, err := db.GetLocationOperatingTimes()
	require.NoError(t, err, "Error fetching location operations")
	assert.Len(t, locations, 2, "Expected 2 locations")

	for i, location := range locations {
		assert.Equal(t, location.Name, locationOperations[i].Name, "Expected location name %s, got %s", locationOperations[i].Name, location.Name)

		assert.Len(t, location.Week, 1, "Expected 1 day operation, got %d", len(location.Week))

		for j, day := range location.Week {
			assert.Equal(
				t,
				day.Day,
				locationOperations[i].Week[j].Day,
				"Expected day %d, got %d",
				locationOperations[i].Week[j].Day,
				day.Day,
			)

			assert.Equal(
				t,
				day.Date,
				locationOperations[i].Week[j].Date,
				"Expected date %s, got %s",
				locationOperations[i].Week[j].Date,
				day.Date,
			)

			assert.Equal(
				t,
				day.Status,
				locationOperations[i].Week[j].Status,
				"Expected status %s, got %s",
				locationOperations[i].Week[j].Status,
				day.Status,
			)

			assert.Len(t, day.Hours, 2, "Expected 2 hours, got %d", len(day.Hours))

			for k, hour := range day.Hours {
				assert.Equal(
					t,
					hour.StartHour,
					locationOperations[i].Week[j].Hours[k].StartHour,
					"Expected start hour %d, got %d",
					locationOperations[i].Week[j].Hours[k].StartHour,
					hour.StartHour,
				)

				assert.Equal(
					t,
					hour.StartMinutes,
					locationOperations[i].Week[j].Hours[k].StartMinutes,
					"Expected start minutes %d, got %d",
					locationOperations[i].Week[j].Hours[k].StartMinutes,
					hour.StartMinutes,
				)

				assert.Equal(
					t,
					hour.EndHour,
					locationOperations[i].Week[j].Hours[k].EndHour,
					"Expected end hour %d, got %d",
					locationOperations[i].Week[j].Hours[k].EndHour,
					hour.EndHour,
				)

				assert.Equal(
					t,
					hour.EndMinutes,
					locationOperations[i].Week[j].Hours[k].EndMinutes,
					"Expected end minutes %d, got %d",
					locationOperations[i].Week[j].Hours[k].EndMinutes,
					hour.EndMinutes,
				)
			}
		}
	}

	err = db.DeleteLocationOperatingTimes()
	require.NoError(t, err, "Error deleting location operations")

	locations, err = db.GetLocationOperatingTimes()
	require.Error(t, err, "Expected error fetching location operations, got nil")

	assert.Nil(t, locations, "Expected nil locations, got %v", locations)
}

func TestDailyItemLifetime(t *testing.T) {
	t.Log("Running TestInsertDailyItem")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	db.DB = testDB

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
			Name:        "Eggs",
			Description: "Scrambled eggs",
			Date:        "2021-09-06",
			Location:    "Allison",
			StationName: "Comfort",
			TimeOfDay:   "Breakfast",
		},
	}

	err := db.InsertDailyItems(dailyItems, false)
	require.NoError(t, err, "Error inserting daily items")

	items, err := db.GetAllDailyItems()
	require.NoError(t, err, "Error fetching daily items")

	assert.Len(t, items, 2, "Expected 2 daily items, got %d", len(items))

	for i, item := range items {
		assert.Equal(t, item.Name, dailyItems[i].Name, "Expected item name %s, got %s", dailyItems[i].Name, item.Name)

		assert.Equal(t, item.Description, dailyItems[i].Description, "Expected item description %s, got %s", dailyItems[i].Description, item.Description)

		assert.Equal(t, item.Date, dailyItems[i].Date, "Expected item date %s, got %s", dailyItems[i].Date, item.Date)

		assert.Equal(t, item.Location, dailyItems[i].Location, "Expected item location %s, got %s", dailyItems[i].Location, item.Location)

		assert.Equal(t, item.StationName, dailyItems[i].StationName, "Expected item station name %s, got %s", dailyItems[i].StationName, item.StationName)

		assert.Equal(t, item.TimeOfDay, dailyItems[i].TimeOfDay, "Expected item time of day %s, got %s", dailyItems[i].TimeOfDay, item.TimeOfDay)
	}

	date, err := db.ReturnDateOfDailyItems()

	require.NoError(t, err, "Error fetching date of daily items")

	assert.Equal(t, date, "2021-09-06", "Expected return date of %s, got %s", "2021-09-06", date)

	err = db.DeleteDailyItems()
	require.NoError(t, err, "Error deleting daily items")

	items, err = db.GetAllDailyItems()
	require.Error(t, err, "Expected error fetching daily items, got nil")

	assert.Nil(t, items, "Expected nil items, got %v", items)

	date, err = db.ReturnDateOfDailyItems()

	require.Error(t, err, "Expected error fetching date of daily items, got nil")
}

func TestDailyItemAllClosed(t *testing.T) {
	t.Log("Running TestDailyItemAllClosed")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	db.DB = testDB

	err := db.InsertDailyItems([]models.DailyItem{}, true)

	require.NoError(t, err, "Error inserting all closed daily items")

	items, err := db.GetAllDailyItems()
	require.NoError(t, err, "Error fetching daily items")

	assert.Len(t, items, 0, "Expected 0 daily items, got %d", len(items))

	err = db.DeleteDailyItems()
	require.NoError(t, err, "Error deleting daily items")

	items, err = db.GetAllDailyItems()

	require.Error(t, err, "Expected error fetching daily items, got nil")

	assert.Nil(t, items, "Expected nil items, got %v", items)
}

func TestAllDataItemLifetime(t *testing.T) {
	t.Log("Running TestAllDataItemLifetime")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	db.DB = testDB

	allDataItems := []models.AllDataItem{
		{Name: "Bacon"},
		{Name: "Eggs"},
	}

	err := db.InsertAllDataItems(allDataItems, false)
	require.NoError(t, err, "Error inserting all data items")

	items, err := db.GetAllDataItems()
	require.NoError(t, err, "Error fetching all data items")

	assert.Len(t, items, 2, "Expected 2 all data items, got %d", len(items))

	for i, item := range items {
		assert.Equal(t, item.Name, allDataItems[i].Name, "Expected item name %s, got %s", allDataItems[i].Name, item.Name)
	}
}

func TestUserPreferencesLifetime(t *testing.T) {
	t.Log("Running TestAllDataItemLifetime")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	db.DB = testDB

	initialAllDataItems := []models.AllDataItem{
		{Name: "Bacon"},
		{Name: "Eggs"},
		{Name: "Skirt Steak"},
		{Name: "Chicken Parmesan"},
	}

	err := db.SaveUserPreferences("test_user", initialAllDataItems)
	require.NoError(t, err, "Error saving user preferences")

	items, err := db.GetUserPreferences("test_user")
	require.NoError(t, err, "Error fetching user preferences")

	assert.Len(t, items, 4, "Expected 4 user preferences, got %d", len(items))
	for i, item := range items {
		assert.Equal(t, item.Name, initialAllDataItems[i].Name, "Expected item name %s, got %s", initialAllDataItems[i].Name, item.Name)
	}

	// Add a new items to the user preferences
	additionalDataItems := []models.AllDataItem{
		{Name: "Mac and Cheese"},
		{Name: "Baked Ziti"},
	}

	newAllDataItems := append(initialAllDataItems, additionalDataItems...)

	err = db.SaveUserPreferences("test_user", newAllDataItems)
	require.NoError(t, err, "Error saving user preferences with new items")

	items, err = db.GetUserPreferences("test_user")
	require.NoError(t, err, "Error fetching user preferences with new items")

	assert.Len(t, items, 6, "Expected 6 user preferences, got %d", len(items))

	for i, item := range items {
		assert.Equal(t, item.Name, newAllDataItems[i].Name, "Expected item name %s, got %s", newAllDataItems[i].Name, item.Name)
	}
}

func TestUserPreferencesLifetimeEmpty(t *testing.T) {
	t.Log("Running TestUserPreferencesLifetimeEmpty")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	db.DB = testDB

	items, err := db.GetUserPreferences("test_user")
	require.Error(t, err, "Expected error fetching user preferences, got nil")

	assert.Nil(t, items, "Expected nil items, got %v", items)
}

func TestAvailableFavorites(t *testing.T) {
	t.Log("Running TestAvailableFavorites")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	db.DB = testDB

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
			Name:        "Eggs",
			Description: "Scrambled eggs",
			Date:        "2021-09-06",
			Location:    "Allison",
			StationName: "Comfort",
			TimeOfDay:   "Breakfast",
		},
	}

	err := db.InsertDailyItems(dailyItems, false)
	require.NoError(t, err, "Error inserting daily items")

	// Set up a user's preferences
	initialPreferences := []models.AllDataItem{
		{Name: "Bacon"},
		{Name: "Eggs"},
	}

	err = db.SaveUserPreferences("test_user", initialPreferences)
	require.NoError(t, err, "Error saving user preferences")

	// Fetch the available favorites based on user preferences
	favorites, err := db.GetAvailableFavorites("test_user")
	require.NoError(t, err, "Error fetching available favorites")

	// Check if the favorites match the user preferences
	assert.Len(t, favorites, 2, "Expected 2 favorite items, got %d", len(favorites))

	for i, favorite := range favorites {
		assert.Equal(t, favorite.Name, initialPreferences[i].Name, "Expected favorite name %s, got %s", initialPreferences[i].Name, favorite.Name)
	}

	// Delete the test data
	err = db.DeleteDailyItems()
	require.NoError(t, err, "Error deleting daily items")

	favorites, err = db.GetAvailableFavorites("test_user")
	assert.Len(t, favorites, 0, "Expected 0 favorite items, got %d", len(favorites))
}
