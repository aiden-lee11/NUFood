package db_test

import (
	"backend/internal/db"
	"backend/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"testing"
)

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

func TestInsertLocationOperations(t *testing.T) {

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

	if locations[0].Name != "allison dining commons" {
		t.Fatalf("Expected allison dining commons, got %s", locations[0].Name)
	}
	if locations[1].Name != "sargent" {
		t.Fatalf("Expected sargent, got %s", locations[1].Name)
	}
}
