package db_test

import (
	"backend/internal/db"
	"backend/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"testing"
)

// Total functions in db.go

// Unnecessary to test:
// func AllDataItemToGorm(item AllDataItem) GormAllDataItem {
// func DailyItemToGorm(item DailyItem) GormDailyItem {
// func InitDB(databasePath string) error {

// Necessary to test:
// func FindFavoriteItemInDailyItems(favorite string) ([]DailyItem, error) {
// func InsertDailyItem(item DailyItem) error {
// func DeleteDailyItems() error {
// func ReturnDateOfDailyItems() (date string, err error) {
// func InsertAllDataItem(item AllDataItem) error {
// func SaveUserPreferences(userID string, favorites []AllDataItem) error {
// func GetAvailableFavorites(userID string) ([]DailyItem, error) {
// func GetUserPreferences(userID string) ([]AllDataItem, error) {
// func GetAllDataItems() ([]AllDataItem, error) {
// func GetAllDailyItems() ([]DailyItem, error) {
// func InsertLocationOperations(locationOperations []models.LocationOperation) error {
// func GetLocationOperations() ([]models.LocationOperation, error) {
// func DeleteLocationOperations() error {

// TODO Add tests for the following functions:
// func FindFavoriteItemInDailyItems(favorite string) ([]DailyItem, error) {
// func ReturnDateOfDailyItems() (date string, err error) {
// func InsertAllDataItem(item AllDataItem) error {
// func SaveUserPreferences(userID string, favorites []AllDataItem) error {
// func GetAvailableFavorites(userID string) ([]DailyItem, error) {
// func GetUserPreferences(userID string) ([]AllDataItem, error) {
// func GetAllDataItems() ([]AllDataItem, error) {

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	t.Log("Setting up test database")

	// Initialize an in-memory SQLite database
	DB, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to initialize test database: %v", err)
	}

	// Apply migrations
	err = DB.AutoMigrate(&db.GormDailyItem{}, &db.GormAllDataItem{}, &db.UserPreferences{}, &db.GormLocationOperation{})
	if err != nil {
		t.Fatalf("Failed to migrate schema: %v", err)
	}

	t.Log("Test database initialized successfully")

	return DB
}

func teardownTestDB(db *gorm.DB, t *testing.T) {
	t.Helper()
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("Failed to retrieve SQL DB from Gorm DB: %v", err)
	}
	sqlDB.Close()
}

func TestLocationOperationsLifeTime(t *testing.T) {

	t.Log("Running TestInsertLocationOperations")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	db.DB = testDB

	locationOperations := []models.LocationOperation{
		{
			Name: "allison dining commons",
			Week: []models.DayOperation{
				{
					Day:    0,
					Date:   "2021-09-06",
					Status: "open",
					Hours: []models.HourOperation{
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
			Week: []models.DayOperation{
				{
					Day:    0,
					Date:   "2021-09-06",
					Status: "open",
					Hours: []models.HourOperation{
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

	err := db.InsertLocationOperations(locationOperations)
	if err != nil {
		t.Fatalf("Error inserting location operations: %v", err)
	}

	locations, err := db.GetLocationOperations()
	if err != nil {
		t.Fatalf("Error fetching location operations: %v", err)
	}

	if len(locations) != 2 {
		t.Fatalf("Expected 2 locations, got %d", len(locations))
	}

	for i, location := range locations {
		if location.Name != locationOperations[i].Name {
			t.Fatalf("Expected location name %s, got %s", locationOperations[i].Name, location.Name)
		}

		if len(location.Week) != 1 {
			t.Fatalf("Expected 1 day operation, got %d", len(location.Week))
		}

		for j, day := range location.Week {
			if day.Day != locationOperations[i].Week[j].Day {
				t.Fatalf("Expected day %d, got %d", locationOperations[i].Week[j].Day, day.Day)
			}

			if day.Date != locationOperations[i].Week[j].Date {
				t.Fatalf("Expected date %s, got %s", locationOperations[i].Week[j].Date, day.Date)
			}

			if day.Status != locationOperations[i].Week[j].Status {
				t.Fatalf("Expected status %s, got %s", locationOperations[i].Week[j].Status, day.Status)
			}

			if len(day.Hours) != 2 {
				t.Fatalf("Expected 2 hours, got %d", len(day.Hours))
			}

			for k, hour := range day.Hours {
				if hour.StartHour != locationOperations[i].Week[j].Hours[k].StartHour {
					t.Fatalf("Expected start hour %d, got %d", locationOperations[i].Week[j].Hours[k].StartHour, hour.StartHour)
				}

				if hour.StartMinutes != locationOperations[i].Week[j].Hours[k].StartMinutes {
					t.Fatalf("Expected start minutes %d, got %d", locationOperations[i].Week[j].Hours[k].StartMinutes, hour.StartMinutes)
				}

				if hour.EndHour != locationOperations[i].Week[j].Hours[k].EndHour {
					t.Fatalf("Expected end hour %d, got %d", locationOperations[i].Week[j].Hours[k].EndHour, hour.EndHour)
				}

				if hour.EndMinutes != locationOperations[i].Week[j].Hours[k].EndMinutes {
					t.Fatalf("Expected end minutes %d, got %d", locationOperations[i].Week[j].Hours[k].EndMinutes, hour.EndMinutes)
				}
			}
		}
	}

	err = db.DeleteLocationOperations()
	if err != nil {
		t.Fatalf("Error deleting location operations: %v", err)
	}

	locations, err = db.GetLocationOperations()
	if err == nil {
		t.Fatalf("Expected error fetching location operations, got nil")
	}

	if locations != nil {
		t.Fatalf("Expected nil locations, got %v", locations)
	}

	if err.Error() != "no location operations found" {
		t.Fatalf("Expected error message 'no location operations found', got %v", err.Error())
	}

}

func TestDailyItemLifetime(t *testing.T) {
	t.Log("Running TestInsertDailyItem")
	// Set up the database
	testDB := setupTestDB(t)
	defer teardownTestDB(testDB, t)

	// Override the global DB variable in your `db` package
	db.DB = testDB

	// type DailyItem struct {
	// 	Name        string
	// 	Description string `json:"desc"`
	// 	Date        string // The date this item is available
	// 	Location    string // The dining hall location
	// 	StationName string // The station name
	// 	TimeOfDay   string // The time of day this item is available
	// }

	dailyItems := []db.DailyItem{
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

	for _, item := range dailyItems {
		err := db.InsertDailyItem(item)
		if err != nil {
			t.Fatalf("Error inserting daily item: %v", err)
		}

	}

	items, err := db.GetAllDailyItems()
	if err != nil {
		t.Fatalf("Error fetching daily items: %v", err)
	}

	if len(items) != 2 {
		t.Fatalf("Expected 2 daily items, got %d", len(items))
	}

	for i, item := range items {
		if item.Name != dailyItems[i].Name {
			t.Fatalf("Expected item name %s, got %s", dailyItems[i].Name, item.Name)
		}

		if item.Description != dailyItems[i].Description {
			t.Fatalf("Expected item description %s, got %s", dailyItems[i].Description, item.Description)
		}

		if item.Date != dailyItems[i].Date {
			t.Fatalf("Expected item date %s, got %s", dailyItems[i].Date, item.Date)
		}

		if item.Location != dailyItems[i].Location {
			t.Fatalf("Expected item location %s, got %s", dailyItems[i].Location, item.Location)
		}

		if item.StationName != dailyItems[i].StationName {
			t.Fatalf("Expected item station name %s, got %s", dailyItems[i].StationName, item.StationName)
		}

		if item.TimeOfDay != dailyItems[i].TimeOfDay {
			t.Fatalf("Expected item time of day %s, got %s", dailyItems[i].TimeOfDay, item.TimeOfDay)
		}
	}

	err = db.DeleteDailyItems()
	if err != nil {
		t.Fatalf("Error deleting daily items: %v", err)
	}

	items, err = db.GetAllDailyItems()
	if err == nil {
		t.Fatalf("Expected error fetching daily items, got nil")
	}

	if items != nil {
		t.Fatalf("Expected nil items, got %v", items)
	}

	if err.Error() != "no daily items found" {
		t.Fatalf("Expected error message 'no daily items found', got %v", err.Error())
	}
}
