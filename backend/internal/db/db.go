package db

import (
	"backend/internal/models"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Global database variable
var DB *gorm.DB

// GormDailyItem represents a daily menu item in the database.
type GormDailyItem struct {
	gorm.Model
	models.DailyItem `gorm:"unique"`
	AllClosed        *bool `gorm:"column:all_closed"`
}

type GormWeeklyItem struct {
	gorm.Model
	models.DailyItem
	DayIndex int `gorm:"index"`
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

// GormNutritionGoals represents user-defined nutrition goals
type GormNutritionGoals struct {
	gorm.Model
	UserID   string `gorm:"unique"` // Unique identifier for the user
	Calories float64
	Protein  float64
	Carbs    float64
	Fat      float64
}

// Package-level errors for database operations.
var (
	NoItemsInDB           = errors.New("no daily items found")
	NoUserPreferencesInDB = errors.New("no user preferences found")
	NoUserGoalsInDB       = errors.New("no user nutrition goals found")
)

const NEWEST_DAY_INDEX = 3

// AllDataItemToGorm converts an AllDataItem model to a GormAllDataItem.
func AllDataItemToGorm(item models.AllDataItem) GormAllDataItem {
	return GormAllDataItem{AllDataItem: item}
}

// DailyItemToGorm converts a DailyItem model to a GormDailyItem.
func DailyItemToGorm(item models.DailyItem) GormDailyItem {
	return GormDailyItem{DailyItem: item}
}

func WeeklyItemToGorm(item models.WeeklyItem) GormWeeklyItem {
	return GormWeeklyItem{DailyItem: item.DailyItem, DayIndex: item.DayIndex}
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
	err = DB.AutoMigrate(&GormAllDataItem{}, &GormUserPreferences{}, &GormLocationOperatingTimes{}, &GormWeeklyItem{}, &GormNutritionGoals{})
	if err != nil {
		return err
	}

	log.Println("Database initialized and schema migrated successfully")
	return nil
}

func InsertWeeklyItems(items []models.WeeklyItem) error {
	if len(items) == 0 {
		log.Println("No weekly items, skipping insert")
		return nil
	}
	var gormItems []GormWeeklyItem

	for _, item := range items {
		appendable := WeeklyItemToGorm(item)
		gormItems = append(gormItems, appendable)
	}

	// Use CreateInBatches to insert items in chunks
	batchSize := 500
	result := DB.CreateInBatches(&gormItems, batchSize)

	if result.Error != nil {
		log.Println("Error inserting weekly items:", result.Error)
		return result.Error
	}

	log.Println("Weekly items inserted successfully")
	return nil
}

// goal of this func is to test out the FIFO on db where we keep +- 3 days of item data
// this func should be passed the items for the third day in the future ie if today is monday then pass the items for thursday
func UpdateWeeklyItems(items []models.DailyItem) error {
	if len(items) == 0 {
		log.Println("No available items, skipping all data insert")
		return nil
	}

	// delete the oldest day that would now be 4 days old
	if err := DB.Where("day_index = ?", -3).Delete(&models.WeeklyItem{}).Error; err != nil {
		log.Println("Error deleting records:", err)
		return err
	}

	// slide the window of days to be one older
	if err := DB.Model(&models.WeeklyItem{}).Where("day_index > ?", -3).
		Update("day_index", gorm.Expr("day_index - 1")).Error; err != nil {
		log.Println("Error updating records:", err)
		return err
	}

	var weeklyItems []models.WeeklyItem

	for _, item := range items {
		appendable := models.WeeklyItem{DailyItem: item, DayIndex: NEWEST_DAY_INDEX}
		weeklyItems = append(weeklyItems, appendable)
	}

	if err := InsertWeeklyItems(weeklyItems); err != nil {
		log.Println("Error inserting weekly items in update:", err)
		return err
	}

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
func InsertAllDataItems(items []models.AllDataItem) error {
	if len(items) == 0 {
		log.Println("No available items, skipping all data insert")
		return nil
	}

	cleanedItems, err := CleanAllData(items)

	if err != nil {
		log.Println("Error cleaning the items before inserting to all data table: ", err)
		return nil
	}

	if len(cleanedItems) == 0 {
		log.Println("No new items, skipping all data insert")
		return nil
	}

	var gormItems []GormAllDataItem

	for _, item := range cleanedItems {
		appendable := AllDataItemToGorm(item)
		gormItems = append(gormItems, appendable)
	}

	// Insert the unique item into the allData using batches
	batchSize := 500
	result := DB.CreateInBatches(&gormItems, batchSize)
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

	// Insert into the database using batches
	batchSize := 500
	result := DB.CreateInBatches(&gormLocationOperatingTimes, batchSize)
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
// Should index into the weeklyItems table and return the date of an item with the day index field of 0
//
// Returns:
// - string: The date of the daily items.
// - error: An error if no items are found or the query fails.
func ReturnDateOfDailyItems() (date string, err error) {
	var weeklyItems []GormWeeklyItem
	result := DB.Find(&weeklyItems)
	if result.Error != nil {
		return "", result.Error
	}

	if len(weeklyItems) == 0 {
		return "", NoItemsInDB
	}

	// Find the item with the day index of 0
	for _, item := range weeklyItems {
		if item.DayIndex == 0 {
			return item.Date, nil
		}
	}

	return "", errors.New("no item with day index 0 found")
}

func GetAllWeeklyItems() (map[string][]models.DailyItem, error) {
	var weeklyItems []GormWeeklyItem
	result := DB.Find(&weeklyItems)
	if result.Error != nil {
		return nil, result.Error
	}

	if len(weeklyItems) == 0 {
		return nil, NoItemsInDB
	}

	items := make(map[string][]models.DailyItem, 7)
	today := time.Now()

	for i := -3; i <= 3; i++ {
		dateKey := today.AddDate(0, 0, i).Format("2006-01-02")
		items[dateKey] = make([]models.DailyItem, 0)
	}

	for _, item := range weeklyItems {
		dateKey := today.AddDate(0, 0, item.DayIndex).Format("2006-01-02")
		items[dateKey] = append(items[dateKey], item.DailyItem)
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

	result := DB.Where(GormUserPreferences{UserID: userID}).Attrs(GormUserPreferences{Favorites: "[]", Mailing: false}).FirstOrCreate(&userPreferences)

	// If we created a row that means that the user was not in our db before so there are no items
	if result.RowsAffected == 1 {
		return nil, NoUserPreferencesInDB
	}

	if result.Error != nil {
		log.Println("Error in get user preferences: ", result.Error)
		return nil, result.Error
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
	// search instead in weeklyItems table where day_index = 0
	result := DB.Table("gorm_weekly_items").
		Where("name IN ? AND day_index = 0", search).
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

// DeleteWeeklyItems removes all records from the weekly items table.
//
// Returns:
// - error: An error if the deletion operation fails.
func DeleteWeeklyItems() error {
	// Attempt to delete all items from gorm_weekly_items table
	result := DB.Exec("DELETE FROM gorm_weekly_items WHERE EXISTS (SELECT 1 FROM gorm_weekly_items LIMIT 1)")
	if result.Error != nil {
		fmt.Println("Error deleting weekly items:", result.Error)
		return result.Error
	}

	fmt.Println("All weekly items deleted")
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

// SaveNutritionGoals saves a user's nutrition goals to the database.
//
// Parameters:
// - userID: The unique identifier for the user.
// - goals: The nutrition goals to save.
//
// Returns:
// - error: An error if the operation fails.
func SaveNutritionGoals(userID string, goals models.NutritionGoals) error {
	var existingGoals GormNutritionGoals

	// Check if goals already exist for this user
	result := DB.Where("user_id = ?", userID).First(&existingGoals)

	if result.Error != nil && !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return result.Error
	}

	// If goals already exist, update them
	if result.RowsAffected > 0 {
		existingGoals.Calories = goals.Calories
		existingGoals.Protein = goals.Protein
		existingGoals.Carbs = goals.Carbs
		existingGoals.Fat = goals.Fat

		result = DB.Save(&existingGoals)
		if result.Error != nil {
			return result.Error
		}

		return nil
	}

	// Otherwise, create new goals
	newGoals := GormNutritionGoals{
		UserID:   userID,
		Calories: goals.Calories,
		Protein:  goals.Protein,
		Carbs:    goals.Carbs,
		Fat:      goals.Fat,
	}

	result = DB.Create(&newGoals)
	if result.Error != nil {
		return result.Error
	}

	return nil
}

// GetNutritionGoals retrieves a user's nutrition goals from the database.
//
// Parameters:
// - userID: The unique identifier for the user.
//
// Returns:
// - models.NutritionGoals: The user's nutrition goals.
// - error: An error if the operation fails.
func GetNutritionGoals(userID string) (models.NutritionGoals, error) {
	var gormGoals GormNutritionGoals

	result := DB.Where("user_id = ?", userID).First(&gormGoals)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return models.NutritionGoals{}, NoUserGoalsInDB
		}
		return models.NutritionGoals{}, result.Error
	}

	goals := models.NutritionGoals{
		Calories: gormGoals.Calories,
		Protein:  gormGoals.Protein,
		Carbs:    gormGoals.Carbs,
		Fat:      gormGoals.Fat,
	}

	return goals, nil
}
