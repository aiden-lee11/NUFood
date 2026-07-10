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
	"gorm.io/gorm/clause"
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
	// Deprecated: retained so existing deployments can migrate without a
	// destructive schema change. DailyItem.Date is now authoritative.
	DayIndex int `gorm:"index"`
}

// GormAllDataItem represents a unique menu item in the database.
type GormAllDataItem struct {
	gorm.Model
	models.AllDataItem
}

// GormUserPreferences represents user-specific preferences for menu items.
type GormUserPreferences struct {
	gorm.Model
	UserID             string `gorm:"unique"` // Unique identifier for the user.
	Favorites          string // JSON-encoded array of item names marked as favorites.
	Mailing            bool   // Bool value to know if the user wants their available favorites in a daily email.
	DisplayPreferences string // JSON-encoded display settings (locations currently).
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

const MenuRetentionDays = 100

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

	if err = Migrate(DB); err != nil {
		return err
	}

	log.Println("Database initialized and schema migrated successfully")
	return nil
}

func Migrate(database *gorm.DB) error {
	if err := database.AutoMigrate(
		&GormAllDataItem{},
		&GormUserPreferences{},
		&GormLocationOperatingTimes{},
		&GormWeeklyItem{},
		&GormNutritionGoals{},
	); err != nil {
		return err
	}

	return database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`
			DELETE FROM gorm_all_data_items
			WHERE id NOT IN (
				SELECT MIN(id) FROM gorm_all_data_items GROUP BY name
			)
		`).Error; err != nil {
			return fmt.Errorf("deduplicate all-data items: %w", err)
		}
		if err := tx.Exec(`
			CREATE UNIQUE INDEX IF NOT EXISTS idx_gorm_all_data_items_name
			ON gorm_all_data_items (name)
		`).Error; err != nil {
			return fmt.Errorf("create all-data name index: %w", err)
		}
		return nil
	})
}

func InsertWeeklyItems(items []models.WeeklyItem) error {
	return insertWeeklyItems(DB, items)
}

func insertWeeklyItems(tx *gorm.DB, items []models.WeeklyItem) error {
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
	result := tx.CreateInBatches(&gormItems, batchSize)

	if result.Error != nil {
		log.Println("Error inserting weekly items:", result.Error)
		return result.Error
	}

	log.Println("Weekly items inserted successfully")
	return nil
}

// UpdateWeeklyItems replaces the rows for the dates represented by items and
// prunes menu history older than MenuRetentionDays.
func UpdateWeeklyItems(items []models.DailyItem) error {
	if len(items) == 0 {
		return errors.New("cannot update weekly items with an empty scrape")
	}

	weeklyItems := make([]models.WeeklyItem, 0, len(items))
	for _, item := range items {
		weeklyItems = append(weeklyItems, models.WeeklyItem{DailyItem: item})
	}

	return PersistScrapedMenu(weeklyItems, nil, nil, time.Now())
}

// PersistScrapedMenu atomically replaces scraped dates, records newly observed
// food names, and prunes menu rows older than the configured retention window.
func PersistScrapedMenu(items []models.WeeklyItem, allDataItems []models.AllDataItem, scrapedDates []string, now time.Time) error {
	if DB == nil {
		return errors.New("database is not initialized")
	}

	cleanItems, itemDates, err := normalizeWeeklyItems(items)
	if err != nil {
		return err
	}
	dates, err := normalizeScrapedDates(scrapedDates)
	if err != nil {
		return err
	}
	if len(dates) == 0 {
		dates = itemDates
	}
	if len(dates) == 0 {
		return errors.New("cannot persist a scrape without any dates")
	}

	cutoff := now.AddDate(0, 0, -MenuRetentionDays).Format("2006-01-02")
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Unscoped().Where("date IN ?", dates).Delete(&GormWeeklyItem{}).Error; err != nil {
			return fmt.Errorf("replace scraped menu dates: %w", err)
		}
		if err := insertWeeklyItems(tx, cleanItems); err != nil {
			return fmt.Errorf("insert scraped menu items: %w", err)
		}
		if err := tx.Unscoped().Where("date < ?", cutoff).Delete(&GormWeeklyItem{}).Error; err != nil {
			return fmt.Errorf("prune menu history before %s: %w", cutoff, err)
		}

		uniqueAllData := uniqueAllDataItems(allDataItems)
		if len(uniqueAllData) == 0 {
			return nil
		}
		gormItems := make([]GormAllDataItem, 0, len(uniqueAllData))
		for _, item := range uniqueAllData {
			gormItems = append(gormItems, AllDataItemToGorm(item))
		}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).CreateInBatches(&gormItems, 500).Error; err != nil {
			return fmt.Errorf("insert all-data items: %w", err)
		}
		return nil
	})
}

func normalizeWeeklyItems(items []models.WeeklyItem) ([]models.WeeklyItem, []string, error) {
	seenItems := make(map[string]struct{}, len(items))
	seenDates := make(map[string]struct{})
	cleanItems := make([]models.WeeklyItem, 0, len(items))
	dates := make([]string, 0)

	for _, item := range items {
		dailyItem := item.DailyItem
		if _, err := time.Parse("2006-01-02", dailyItem.Date); err != nil {
			return nil, nil, fmt.Errorf("invalid menu date %q: %w", dailyItem.Date, err)
		}
		if _, exists := seenDates[dailyItem.Date]; !exists {
			seenDates[dailyItem.Date] = struct{}{}
			dates = append(dates, dailyItem.Date)
		}

		key := strings.Join([]string{
			dailyItem.Date,
			dailyItem.Location,
			dailyItem.TimeOfDay,
			dailyItem.StationName,
			dailyItem.Name,
		}, "\x00")
		if _, exists := seenItems[key]; exists {
			continue
		}
		seenItems[key] = struct{}{}
		item.DayIndex = 0
		cleanItems = append(cleanItems, item)
	}

	return cleanItems, dates, nil
}

func normalizeScrapedDates(dates []string) ([]string, error) {
	seen := make(map[string]struct{}, len(dates))
	result := make([]string, 0, len(dates))
	for _, date := range dates {
		if _, err := time.Parse("2006-01-02", date); err != nil {
			return nil, fmt.Errorf("invalid scraped date %q: %w", date, err)
		}
		if _, exists := seen[date]; exists {
			continue
		}
		seen[date] = struct{}{}
		result = append(result, date)
	}
	return result, nil
}

func uniqueAllDataItems(items []models.AllDataItem) []models.AllDataItem {
	seen := make(map[string]struct{}, len(items))
	result := make([]models.AllDataItem, 0, len(items))
	for _, item := range items {
		name := strings.TrimSpace(item.Name)
		if name == "" {
			continue
		}
		if _, exists := seen[name]; exists {
			continue
		}
		seen[name] = struct{}{}
		result = append(result, models.AllDataItem{Name: name})
	}
	return result
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
	uniqueItems := uniqueAllDataItems(items)
	if len(uniqueItems) == 0 {
		log.Println("No available items, skipping all data insert")
		return nil
	}

	gormItems := make([]GormAllDataItem, 0, len(uniqueItems))
	for _, item := range uniqueItems {
		gormItems = append(gormItems, AllDataItemToGorm(item))
	}

	result := DB.Clauses(clause.OnConflict{DoNothing: true}).CreateInBatches(&gormItems, 500)
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
	return insertLocationOperatingTimes(DB, locations)
}

func insertLocationOperatingTimes(tx *gorm.DB, locations []models.LocationOperatingTimes) error {
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
	result := tx.CreateInBatches(&gormLocationOperatingTimes, batchSize)
	if result.Error != nil {
		return fmt.Errorf("failed to insert locationOperatingTimes: %v", result.Error)
	}

	return nil
}

func ReplaceLocationOperatingTimes(locations []models.LocationOperatingTimes) error {
	if len(locations) == 0 {
		return errors.New("cannot replace operating times with an empty scrape")
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Unscoped().Where("1 = 1").Delete(&GormLocationOperatingTimes{}).Error; err != nil {
			return fmt.Errorf("delete old operating times: %w", err)
		}
		if err := insertLocationOperatingTimes(tx, locations); err != nil {
			return fmt.Errorf("insert new operating times: %w", err)
		}
		return nil
	})
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

func SaveDisplayPreferences(userID string, displayPreferences models.DisplayPreferences) error {
	displayPreferencesJSON, err := json.Marshal(displayPreferences)
	if err != nil {
		return fmt.Errorf("error serializing display preferences: %v", err)
	}

	var userPreferences GormUserPreferences
	if err := DB.Where("user_id = ?", userID).First(&userPreferences).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			userPreferences = GormUserPreferences{
				UserID:             userID,
				Favorites:          "[]",
				Mailing:            false,
				DisplayPreferences: string(displayPreferencesJSON),
			}
			return DB.Create(&userPreferences).Error
		}
		return err
	}

	userPreferences.DisplayPreferences = string(displayPreferencesJSON)
	return DB.Save(&userPreferences).Error
}

// ReturnDateOfDailyItems returns today's date when present, otherwise the most
// recent retained menu date.
func ReturnDateOfDailyItems() (date string, err error) {
	var item GormWeeklyItem
	today := time.Now().Format("2006-01-02")
	result := DB.Where("date = ?", today).First(&item)
	if result.Error == nil {
		return item.Date, nil
	}
	if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return "", result.Error
	}

	result = DB.Order("date DESC").First(&item)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return "", NoItemsInDB
		}
		return "", result.Error
	}
	return item.Date, nil
}

func GetAllWeeklyItems() (map[string][]models.DailyItem, error) {
	var weeklyItems []GormWeeklyItem
	result := DB.Order("date ASC, location ASC, time_of_day ASC, station_name ASC, name ASC").Find(&weeklyItems)
	if result.Error != nil {
		return nil, result.Error
	}

	if len(weeklyItems) == 0 {
		return nil, NoItemsInDB
	}

	weeklyItemsMap := make(map[string][]models.DailyItem)
	for _, wItem := range weeklyItems {
		weeklyItemsMap[wItem.Date] = append(weeklyItemsMap[wItem.Date], wItem.DailyItem)
	}

	return weeklyItemsMap, nil
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

func GetDisplayPreferences(userID string) (models.DisplayPreferences, bool, error) {
	var userPreferences GormUserPreferences

	result := DB.Where("user_id = ?", userID).First(&userPreferences)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return models.DisplayPreferences{VisibleLocations: []string{}}, false, nil
	}
	if result.Error != nil {
		return models.DisplayPreferences{VisibleLocations: []string{}}, false, result.Error
	}

	if strings.TrimSpace(userPreferences.DisplayPreferences) == "" {
		return models.DisplayPreferences{VisibleLocations: []string{}}, false, nil
	}

	var displayPreferences models.DisplayPreferences
	if err := json.Unmarshal([]byte(userPreferences.DisplayPreferences), &displayPreferences); err != nil {
		return models.DisplayPreferences{VisibleLocations: []string{}}, false, fmt.Errorf("error deserializing display preferences: %v", err)
	}

	if displayPreferences.VisibleLocations == nil {
		displayPreferences.VisibleLocations = []string{}
	}

	return displayPreferences, true, nil
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
	if len(search) == 0 {
		return []models.DailyItem{}, nil
	}

	var matchingItems []models.DailyItem
	result := DB.Table("gorm_weekly_items").
		Where("name IN ? AND date = ?", search, time.Now().Format("2006-01-02")).
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
	result := DB.Unscoped().Where("1 = 1").Delete(&GormWeeklyItem{})
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
	result := DB.Unscoped().Where("1 = 1").Delete(&GormAllDataItem{})
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
	result := DB.Unscoped().Where("1 = 1").Delete(&GormLocationOperatingTimes{})
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
