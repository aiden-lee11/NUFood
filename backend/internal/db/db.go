package db

import (
	"encoding/json"
	"errors"
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"log"
)

// Global database variable
var DB *gorm.DB

type GormDailyItem struct {
	gorm.Model
	DailyItem
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

// InitDB initializes the SQLite database connection and migrates the schema.
func InitDB(databasePath string) error {
	var err error
	// Open a connection to the SQLite database
	// Open a connection to the PostgreSQL database
	fmt.Println("Connecting to database at", databasePath)

	DB, err = gorm.Open(postgres.Open(databasePath), &gorm.Config{})
	if err != nil {
		return err
	}

	// Auto migrate the schemas
	err = DB.AutoMigrate(&GormDailyItem{}, &GormAllDataItem{}, &UserPreferences{})
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
func InsertDailyItem(item DailyItem) error {
	// Check if the item already exists (by Name, Date, Location, and TimeOfDay)
	var existingItem GormDailyItem
	result := DB.Where("name = ? AND date = ? AND location = ? AND time_of_day = ?", item.Name, item.Date, item.Location, item.TimeOfDay).First(&existingItem)

	if result.Error == nil {
		log.Printf("Item '%s' already exists for date '%s' and location '%s', skipping insertion", item.Name, item.Date, item.Location)
		return nil
	}

	// Insert the new item into the daily data
	savable := DailyItemToGorm(item)
	result = DB.Create(&savable)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Item '%s' inserted successfully", item.Name)
	log.Printf("Item had %s as a station name", item.StationName)
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
func InsertAllDataItem(item AllDataItem) error {
	// Check if the shortened item already exists
	log.Println("Inserting item", item.Name)
	var existingItem GormAllDataItem
	result := DB.Where("name = ?", item.Name).First(&existingItem)

	if result.Error == nil {
		log.Printf("Item '%s' already exists", item.Name)
		return nil
	}

	// Insert the unique item into the allData
	savable := AllDataItemToGorm(item)
	result = DB.Create(&savable)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Item '%s' inserted successfully", item.Name)
	return nil
}

// SaveUserPreferences saves user preferences into the database
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

	// Convert the GormDailyItem slice to a DailyItem slice
	var items []DailyItem
	for _, item := range dailyItems {
		items = append(items, item.DailyItem)
	}

	return items, nil
}
