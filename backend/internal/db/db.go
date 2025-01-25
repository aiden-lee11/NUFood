package db

import (
	"backend/internal/models"
	"encoding/json"
	"errors"
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"log"
	"strings"
	"time"
)

// Global database variable
var DB *gorm.DB

// GormDailyItem represents a daily menu item in the database.
type GormDailyItem struct {
	gorm.Model
	models.DailyItem `gorm:"unique"`
	AllClosed        *bool `gorm:"column:all_closed"`
}

// GormAllDataItem represents a unique menu item in the database.
type GormAllDataItem struct {
	gorm.Model
	models.AllDataItem `gorm:"unique"`
}

// GormUserPreferences represents user-specific preferences for menu items.
type GormUserPreferences struct {
	gorm.Model
	UserID    string `gorm:"unique"` // Unique identifier for the user.
	Favorites string // JSON-encoded array of item names marked as favorites.
	Mailing   bool   //  Bool value to know if the user wants their available favorites in a daily email
}

// GormLocationOperatingTimes represents the operating times for a location.
type GormLocationOperatingTimes struct {
	gorm.Model
	Name string `gorm:"primaryKey"` // Unique identifier for the location.
	Week []byte `gorm:"type:jsonb"` // JSON-encoded weekly operating times.
}

// Package-level errors for database operations.
var (
	NoItemsInDB           = errors.New("no daily items found")
	NoUserPreferencesInDB = errors.New("no user preferences found")
)

// AllDataItemToGorm converts an AllDataItem model to a GormAllDataItem.
func AllDataItemToGorm(item models.AllDataItem) GormAllDataItem {
	return GormAllDataItem{AllDataItem: item}
}

// DailyItemToGorm converts a DailyItem model to a GormDailyItem.
func DailyItemToGorm(item models.DailyItem) GormDailyItem {
	return GormDailyItem{DailyItem: item}
}

// InitDB initializes the PostgreSQL database connection and migrates the schema.
//
// It sets up the global database variable and performs schema migrations to
// ensure that the database tables match the defined models.
//
// Parameters:
// - databasePath: The connection string for the PostgreSQL database.
//
// Returns:
// - error: An error if the database connection or migration fails.
func InitDB(databasePath string) error {
	var err error

	DB, err = gorm.Open(postgres.Open(databasePath), &gorm.Config{})
	if err != nil {
		return err
	}

	// Auto migrate the schemas
	err = DB.AutoMigrate(&GormDailyItem{}, &GormAllDataItem{}, &GormUserPreferences{}, &GormLocationOperatingTimes{})
	if err != nil {
		return err
	}

	log.Println("Database initialized and schema migrated successfully")
	return nil
}

// InsertDailyItems inserts a list of DailyItem objects into the daily items table.
//
// If all locations are closed, a special record is inserted to reflect this.
//
// Parameters:
// - items: A slice of DailyItem objects to be inserted.
// - allClosed: A boolean indicating whether all locations are closed.
//
// Returns:
// - error: An error if the insertion fails.
func InsertDailyItems(items []models.DailyItem, allClosed bool) error {
	// If all locations are closed we will use a hacky fix to insert a single record with allClosed set to true to avoid the no items in db error
	if allClosed {
		item := GormDailyItem{
			DailyItem: models.DailyItem{
				Name:        "All locations are closed",
				Description: "All locations are closed",
				Date:        time.Now().Format("2006-01-02"),
				Location:    "All locations are closed",
				StationName: "All locations are closed",
				TimeOfDay:   "All locations are closed",
			},
			AllClosed: &allClosed,
		}

		result := DB.Create(&item)

		if result.Error != nil {
			log.Println("Error inserting allClosedItem:", result.Error)
			return result.Error
		}

		return nil
	}

	var gormItems []GormDailyItem

	for _, item := range items {
		appendable := DailyItemToGorm(item)
		gormItems = append(gormItems, appendable)
	}

	result := DB.Create(&gormItems)

	if result.Error != nil {
		log.Println("Error inserting items:", result.Error)
		return result.Error
	}

	log.Println("All items inserted successfully")
	return nil
}

// InsertAllDataItems inserts a list of AllDataItem objects into the all data table.
//
// This operation is skipped if the provided list is empty or if all locations are closed.
//
// Parameters:
// - items: A slice of AllDataItem objects to be inserted.
// - allClosed: A boolean indicating whether all locations are closed.
//
// Returns:
// - error: An error if the insertion fails.
func InsertAllDataItems(items []models.AllDataItem, allClosed bool) error {
	if allClosed || items == nil {
		log.Println("No available items, skipping all data insert")
		return nil
	}

	cleanedItems, err := CleanAllData(items)

	if err != nil {
		log.Println("Error cleaning the items before inserting to all data table: ", err)
		return nil
	}

	var gormItems []GormAllDataItem

	for _, item := range cleanedItems {
		appendable := AllDataItemToGorm(item)
		gormItems = append(gormItems, appendable)
	}

	// Insert the unique item into the allData
	result := DB.Create(&gormItems)
	if result.Error != nil {
		log.Println("Error inserting items:", result.Error)
		return result.Error
	}

	log.Println("All items inserted successfully")
	return nil
}

// InsertLocationOperatingTimes inserts a list of LocationOperatingTimes into the database.
//
// This function serializes the weekly operating times into JSON format for storage.
//
// Parameters:
// - locations: A slice of LocationOperatingTimes objects to be inserted.
//
// Returns:
// - error: An error if the insertion fails.
func InsertLocationOperatingTimes(locations []models.LocationOperatingTimes) error {
	var gormLocationOperatingTimes []GormLocationOperatingTimes

	for _, locationOperatingTimes := range locations {
		// Serialize the Week field to JSON
		weekData, err := json.Marshal(locationOperatingTimes.Week)
		if err != nil {
			return fmt.Errorf("failed to serialize Week field: %v", err)
		}

		// Create the record
		record := GormLocationOperatingTimes{
			Name: locationOperatingTimes.Name,
			Week: weekData,
		}

		gormLocationOperatingTimes = append(gormLocationOperatingTimes, record)
	}

	// Insert into the database
	result := DB.Create(&gormLocationOperatingTimes)
	if result.Error != nil {
		return fmt.Errorf("failed to insert locationOperatingTimes: %v", result.Error)
	}

	return nil

}

// SaveUserPreferences saves user-specific preferences into the database.
//
// This function overwrites existing preferences with the provided list of favorites.
//
// Parameters:
// - userID: The ID of the user whose preferences are being saved.
// - favorites: A slice of AllDataItem objects representing the user's favorite items.
//
// Returns:
// - error: An error if the save operation fails.
func SaveUserPreferences(userID string, favorites []models.AllDataItem) error {
	// Convert the maps to JSON
	favoritesJSON, err := json.Marshal(favorites)
	if err != nil {
		return fmt.Errorf("error serializing favorites: %v", err)
	}

	// Check if the user preferences already exist
	var userPreferences GormUserPreferences
	if err := DB.Where("user_id = ?", userID).First(&userPreferences).Error; err != nil {
		// Create a new user preferences record if not found
		userPreferences = GormUserPreferences{
			UserID:    userID,
			Favorites: string(favoritesJSON),
		}
		return DB.Create(&userPreferences).Error
	}

	// If the user preferences exist, update the existing record
	userPreferences.Favorites = string(favoritesJSON)
	return DB.Save(&userPreferences).Error
}

func UpdateMailingStatus(userID string, mailing bool) error {
	// Perform the update
	result := DB.Model(&GormUserPreferences{}).Where("user_id = ?", userID).Update("mailing", mailing)

	// Check for errors
	if result.Error != nil {
		return result.Error
	}

	// Check if any rows were affected
	if result.RowsAffected == 0 {
		return fmt.Errorf("no rows updated for user_id: %s", userID)
	}

	return nil
}

// ReturnDateOfDailyItems retrieves the date associated with the daily items in the database.
//
// Returns:
// - string: The date of the daily items.
// - error: An error if no items are found or the query fails.
// BUG Still returning a string of words and not a date for when theyre all closed for some reason?
func ReturnDateOfDailyItems() (date string, err error) {
	var dailyItems []GormDailyItem
	result := DB.Find(&dailyItems)
	if result.Error != nil {
		fmt.Println("Error getting all items")
		return "", result.Error
	}

	// Check if the dailyItems slice is empty
	if len(dailyItems) == 0 {
		fmt.Println("No items found")
		return "", NoItemsInDB
	}

	date = dailyItems[0].Date
	log.Println("Date of daily items:", date)

	return date, nil
}

// GetAllDailyItems retrieves all records from the daily items table.
//
// Returns:
// - []models.DailyItem: A slice of DailyItem objects.
// - error: An error if no items are found or the query fails.
func GetAllDailyItems() ([]models.DailyItem, error) {
	var dailyItems []GormDailyItem
	result := DB.Find(&dailyItems)
	if result.Error != nil {
		return nil, result.Error
	}

	// Check if the dailyItems slice is empty
	if len(dailyItems) == 0 {
		return nil, NoItemsInDB
	}

	// If everything was closed there exists no error however there also exists no data so treat as such
	if dailyItems[0].AllClosed != nil {
		return []models.DailyItem{}, nil
	}

	// Convert the GormDailyItem slice to a DailyItem slice
	var items []models.DailyItem
	for _, item := range dailyItems {
		items = append(items, item.DailyItem)
	}

	return items, nil
}

// GetAllDataItems retrieves all records from the all data table.
//
// Returns:
// - []models.AllDataItem: A slice of AllDataItem objects.
// - error: An error if no items are found or the query fails.
func GetAllDataItems() ([]models.AllDataItem, error) {
	var allDataItems []GormAllDataItem
	result := DB.Find(&allDataItems)
	if result.Error != nil {
		return nil, result.Error
	}

	// Check if the allDataItems slice is empty
	if len(allDataItems) == 0 {
		return nil, NoItemsInDB
	}

	// Convert the GormAllDataItem slice to an AllDataItem slice
	var items []models.AllDataItem
	for _, item := range allDataItems {
		items = append(items, models.AllDataItem{Name: item.Name})
	}

	return items, nil
}

// GetLocationOperatingTimes retrieves all location operating times from the database.
//
// This function deserializes the stored JSON data into LocationOperatingTimes objects.
//
// Returns:
// - []models.LocationOperatingTimes: A slice of LocationOperatingTimes objects.
// - error: An error if no records are found or the query fails.
func GetLocationOperatingTimes() ([]models.LocationOperatingTimes, error) {
	var gormLocationOperatingTimes []GormLocationOperatingTimes
	result := DB.Find(&gormLocationOperatingTimes)
	if result.Error != nil {
		return nil, result.Error
	}

	// Check if the gormLocationOperatingTimes slice is empty
	if len(gormLocationOperatingTimes) == 0 {
		return nil, errors.New("no locationOperatingTimes found")
	}

	// Convert the GormLocationOperatingTimes slice to a OperationHour slice
	var locationOperatingTimesList []models.LocationOperatingTimes
	for _, gormOperationHour := range gormLocationOperatingTimes {
		var week []models.DailyOperatingTimes
		err := json.Unmarshal(gormOperationHour.Week, &week)
		if err != nil {
			return nil, fmt.Errorf("failed to deserialize Week field: %v", err)
		}

		locationOperatingTimesList = append(locationOperatingTimesList, models.LocationOperatingTimes{
			Name: gormOperationHour.Name,
			Week: week,
		})
	}

	return locationOperatingTimesList, nil
}

// GetUserPreferences fetches the user's saved preferences from the database.
//
// Parameters:
// - userID: The ID of the user whose preferences are being retrieved.
//
// Returns:
// - []models.AllDataItem: A slice of AllDataItem objects representing the user's favorites.
// - error: An error if the preferences are not found or the query fails.
func GetUserPreferences(userID string) ([]models.AllDataItem, error) {
	var userPreferences GormUserPreferences

	result := DB.Where("user_id = ?", userID).First(&userPreferences)

	if result.Error != nil {
		return nil, NoUserPreferencesInDB
	}

	// Deserialize the JSON strings to maps
	var favorites []models.AllDataItem

	if err := json.Unmarshal([]byte(userPreferences.Favorites), &favorites); err != nil {
		return nil, fmt.Errorf("error deserializing favorites: %v", err)
	}

	// Return the deserialized maps as part of the user preferences
	log.Println("User preferences:", favorites)
	return favorites, nil
}

func GetUserMailing(userID string) (*bool, error) {
	var userPreferences GormUserPreferences

	result := DB.Where("user_id = ?", userID).First(&userPreferences)

	if result.Error != nil {
		return nil, NoUserPreferencesInDB
	}

	return &userPreferences.Mailing, nil
}

func GetAvailableFavoritesBatch(userID string) ([]models.DailyItem, error) {
	userPreferences, err := GetUserPreferences(userID)

	if err != nil {
		return nil, err
	}
	var search []string

	for _, pref := range userPreferences {
		search = append(search, pref.Name)
	}
	var matchingItems []models.DailyItem
	result := DB.Table("gorm_daily_items").
		Where("name IN ?", search).
		Find(&matchingItems)

	if result.Error != nil {
		fmt.Println("Error finding favorite items batch search:", result.Error)
		return []models.DailyItem{}, result.Error
	}

	return matchingItems, nil
}

func GetMailingList() ([]models.PreferenceReturn, error) {
	rows, err := DB.Raw("SELECT user_id FROM gorm_user_preferences WHERE mailing = true").Rows()
	if err != nil {
		fmt.Println("Error executing query:", err)
		return nil, err
	}
	defer rows.Close()

	var items []models.PreferenceReturn
	for rows.Next() {
		var item models.PreferenceReturn
		if err := rows.Scan(&item.UserID); err != nil {
			fmt.Println("Error scanning row:", err)
			return nil, err
		}

		userID := strings.TrimSpace(item.UserID)

		availFavorites, err := GetAvailableFavoritesBatch(userID)

		if err != nil {
			fmt.Printf("Error getting favorites for user %s with err %v:\n", item.UserID, err)
			return nil, err
		}

		item.Preferences = availFavorites

		items = append(items, item)
	}

	return items, nil
}

// DeleteDailyItems removes all records from the daily items table.
//
// Returns:
// - error: An error if the deletion operation fails.
func DeleteDailyItems() error {
	// Attempt to delete all items from gorm_daily_items table
	result := DB.Exec("DELETE FROM gorm_daily_items WHERE EXISTS (SELECT 1 FROM gorm_daily_items LIMIT 1)")
	if result.Error != nil {
		fmt.Println("Error deleting items:", result.Error)
		return result.Error
	}

	fmt.Println("All items deleted")
	return nil
}

// DeleteAllDataItems removes all records from the allData items table.
//
// Returns:
// - error: An error if the deletion operation fails.
func DeleteAllDataItems() error {
	// Attempt to delete all items from gorm_daily_items table
	result := DB.Exec("DELETE FROM gorm_all_data_items WHERE EXISTS (SELECT 1 FROM gorm_daily_items LIMIT 1)")
	if result.Error != nil {
		fmt.Println("Error deleting items:", result.Error)
		return result.Error
	}

	fmt.Println("All items deleted")
	return nil
}

// DeleteLocationOperatingTimes deletes all records from the location operating times table.
//
// Returns:
// - error: An error if the deletion operation fails.
func DeleteLocationOperatingTimes() error {
	// Attempt to delete all items from gorm_location_operations table
	result := DB.Exec("DELETE FROM gorm_location_operating_times WHERE EXISTS (SELECT 1 FROM gorm_location_operating_times  LIMIT 1)")
	if result.Error != nil {
		fmt.Println("Error deleting location operations:", result.Error)
		return result.Error
	}

	fmt.Println("All location operations deleted")
	return nil
}
