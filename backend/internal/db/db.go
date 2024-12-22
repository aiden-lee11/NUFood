package db

import (
	"backend/internal/models"
	"encoding/json"
	"errors"
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"log"
	"time"
)

// Global database variable
var DB *gorm.DB

type GormDailyItem struct {
	gorm.Model
	DailyItem `gorm:"unique"`
	AllClosed *bool `gorm:"column:all_closed"`
}

type GormAllDataItem struct {
	gorm.Model
	AllDataItem `gorm:"unique"`
}

// MenuItem represents the input data for an item
type DailyItem struct {
	Name        string
	Description string `json:"desc"`
	Date        string // The date this item is available
	Location    string // The dining hall location
	StationName string // The station name
	TimeOfDay   string // The time of day this item is available
}

type AllDataItem struct {
	Name string
}

// UserPreferences represents user-specific preferences for menu items
type UserPreferences struct {
	gorm.Model
	UserID string `gorm:"unique"`
	// Maps of item names to boolean values
	Favorites string // Array of item names marked as favorite
}

type UserPreferencesJSON struct {
	Favorites []AllDataItem
}

// Operation Hours Structs

type GormLocationOperation struct {
	gorm.Model
	Name string `gorm:"primaryKey"` // Name serves as the unique identifier
	Week []byte `gorm:"type:jsonb"` // JSON representation of Week (DayOperation array)
}

// Define NoItemsInDB as a package-level variable
var NoItemsInDB = errors.New("no daily items found")

var NoUserPreferencesInDB = errors.New("no user preferences found")

// ConvertShortedMenuItem converts a MenuItem into a ShortedItem
func AllDataItemToGorm(item AllDataItem) GormAllDataItem {
	return GormAllDataItem{AllDataItem: item}
}

// ConvertMenuItem converts a MenuItem into an Item
func DailyItemToGorm(item DailyItem) GormDailyItem {
	return GormDailyItem{DailyItem: item}
}

// InitDB initializes the PostgreSQL database connection and migrates the schema.
func InitDB(databasePath string) error {
	var err error

	DB, err = gorm.Open(postgres.Open(databasePath), &gorm.Config{})
	if err != nil {
		return err
	}

	// Auto migrate the schemas
	err = DB.AutoMigrate(&GormDailyItem{}, &GormAllDataItem{}, &UserPreferences{}, &GormLocationOperation{})
	if err != nil {
		return err
	}

	log.Println("Database initialized and schema migrated successfully")
	return nil
}

func FindFavoriteItemInDailyItems(favorite string) ([]DailyItem, error) {
	var dailyItems []GormDailyItem
	result := DB.Where("name = ?", favorite).Find(&dailyItems)
	if result.Error != nil {
		fmt.Println("Error finding favorite item:", result.Error)
		return []DailyItem{}, result.Error
	}

	if result.RowsAffected == 0 {
		return []DailyItem{}, errors.New("no favorite item found")
	}

	rows, err := result.Rows()

	if err != nil {
		return []DailyItem{}, result.Error
	}

	defer rows.Close()

	var items []DailyItem
	for rows.Next() {
		var item DailyItem
		DB.ScanRows(rows, &item)
		items = append(items, item)
	}

	return items, nil
}

// InsertItem inserts a new MenuItem into the daily menu, avoiding duplicates by name, date, and location.
func InsertDailyItems(items []DailyItem, allClosed bool) error {
	// If all locations are closed we will use a hacky fix to insert a single record with allClosed set to true to avoid the no items in db error
	if allClosed {
		item := GormDailyItem{
			DailyItem: DailyItem{
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

func DeleteDailyItems() error {
	// Attempt to delete all items from gorm_daily_items table
	result := DB.Exec("DELETE FROM gorm_daily_items")
	if result.Error != nil {
		fmt.Println("Error deleting items:", result.Error)
		return result.Error
	}

	fmt.Println("All items deleted")
	return nil
}

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

// InsertShortenedItem inserts unique menu item names into allData.
func InsertAllDataItems(items []AllDataItem, allClosed bool) error {
	if allClosed || items == nil {
		log.Println("No available items, skipping all data insert")
		return nil
	}

	var gormItems []GormAllDataItem

	for _, item := range items {
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

// SaveUserPreferences saves user preferences into the database
// Does not append to existing preferences, but overwrites them entirely based on the favorites param
func SaveUserPreferences(userID string, favorites []AllDataItem) error {
	// Convert the maps to JSON
	favoritesJSON, err := json.Marshal(favorites)
	if err != nil {
		return fmt.Errorf("error serializing favorites: %v", err)
	}

	// Check if the user preferences already exist
	var userPreferences UserPreferences
	if err := DB.Where("user_id = ?", userID).First(&userPreferences).Error; err != nil {
		if err != nil {
			// Create a new user preferences record if not found
			userPreferences = UserPreferences{
				UserID:    userID,
				Favorites: string(favoritesJSON),
			}
			return DB.Create(&userPreferences).Error
		}
		return err
	}

	// If the user preferences exist, update the existing record
	userPreferences.Favorites = string(favoritesJSON)
	return DB.Save(&userPreferences).Error
}

func GetAvailableFavorites(userID string) ([]DailyItem, error) {
	var favorites []DailyItem
	userPreferences, err := GetUserPreferences(userID)
	log.Println("User preferences:", userPreferences)

	if err != nil {
		return nil, err
	}

	for _, favorite := range userPreferences {
		result, err := FindFavoriteItemInDailyItems(favorite.Name)
		if err != nil {
			// Skip items that are not found
			continue
		}
		favorites = append(favorites, result...)
	}

	log.Println("Available favorites:", favorites)
	return favorites, nil
}

func GetUserPreferences(userID string) ([]AllDataItem, error) {
	var userPreferences UserPreferences

	result := DB.Where("user_id = ?", userID).First(&userPreferences)

	if result.Error != nil {
		return nil, NoUserPreferencesInDB
	}

	// Deserialize the JSON strings to maps
	var favorites []AllDataItem

	if err := json.Unmarshal([]byte(userPreferences.Favorites), &favorites); err != nil {
		return nil, fmt.Errorf("error deserializing favorites: %v", err)
	}

	// Return the deserialized maps as part of the user preferences
	log.Println("User preferences:", favorites)
	return favorites, nil
}

func GetAllDataItems() ([]AllDataItem, error) {
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
	var items []AllDataItem
	for _, item := range allDataItems {
		items = append(items, AllDataItem{Name: item.Name})
	}

	return items, nil
}

func GetAllDailyItems() ([]DailyItem, error) {
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
		return []DailyItem{}, nil
	}

	// Convert the GormDailyItem slice to a DailyItem slice
	var items []DailyItem
	for _, item := range dailyItems {
		items = append(items, item.DailyItem)
	}

	return items, nil
}

func InsertLocationOperations(locationOperations []models.LocationOperation) error {
	var gormLocationOperations []GormLocationOperation

	for _, locationOperation := range locationOperations {
		// Serialize the Week field to JSON
		weekData, err := json.Marshal(locationOperation.Week)
		if err != nil {
			return fmt.Errorf("failed to serialize Week field: %v", err)
		}

		// Create the record
		record := GormLocationOperation{
			Name: locationOperation.Name,
			Week: weekData,
		}

		gormLocationOperations = append(gormLocationOperations, record)
	}

	// Insert into the database
	result := DB.Create(&gormLocationOperations)
	if result.Error != nil {
		return fmt.Errorf("failed to insert LocationOperation: %v", result.Error)
	}

	return nil

}

func GetLocationOperations() ([]models.LocationOperation, error) {
	var gormLocationOperations []GormLocationOperation
	result := DB.Find(&gormLocationOperations)
	if result.Error != nil {
		return nil, result.Error
	}

	// Check if the gormLocationOperations slice is empty
	if len(gormLocationOperations) == 0 {
		return nil, errors.New("no location operations found")
	}

	// Convert the GormLocationOperation slice to a LocationOperation slice
	var locationOperations []models.LocationOperation
	for _, gormLocationOperation := range gormLocationOperations {
		var week []models.DayOperation
		err := json.Unmarshal(gormLocationOperation.Week, &week)
		if err != nil {
			return nil, fmt.Errorf("failed to deserialize Week field: %v", err)
		}

		locationOperations = append(locationOperations, models.LocationOperation{
			Name: gormLocationOperation.Name,
			Week: week,
		})
	}

	return locationOperations, nil
}

func DeleteLocationOperations() error {
	// Attempt to delete all items from gorm_location_operations table
	result := DB.Exec("DELETE FROM gorm_location_operations")
	if result.Error != nil {
		fmt.Println("Error deleting location operations:", result.Error)
		return result.Error
	}

	fmt.Println("All location operations deleted")
	return nil
}
