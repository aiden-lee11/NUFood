package db_test

import (
	"backend/internal/db"
	"backend/internal/models"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.Migrate(testDB))
	db.DB = testDB
	t.Cleanup(func() {
		sqlDB, err := testDB.DB()
		require.NoError(t, err)
		require.NoError(t, sqlDB.Close())
	})
	return testDB
}

func menuItem(date, name, location string) models.WeeklyItem {
	return models.WeeklyItem{DailyItem: models.DailyItem{
		Name:        name,
		Date:        date,
		Location:    location,
		StationName: "Comfort",
		TimeOfDay:   "Lunch",
	}}
}

func TestPersistScrapedMenuReplacesDatesAndPrunesOldHistory(t *testing.T) {
	setupTestDB(t)
	now := time.Date(2026, time.July, 10, 12, 0, 0, 0, time.UTC)
	tooOld := now.AddDate(0, 0, -db.MenuRetentionDays-1).Format("2006-01-02")
	oldestRetained := now.AddDate(0, 0, -db.MenuRetentionDays).Format("2006-01-02")
	today := now.Format("2006-01-02")
	future := now.AddDate(0, 0, 3).Format("2006-01-02")

	initial := []models.WeeklyItem{
		menuItem(tooOld, "Expired", "Allison"),
		menuItem(oldestRetained, "Still retained", "Allison"),
		menuItem(today, "Old today item", "Allison"),
		menuItem(future, "Future item", "Sargent"),
	}
	require.NoError(t, db.PersistScrapedMenu(
		initial,
		[]models.AllDataItem{{Name: "Old today item"}},
		[]string{tooOld, oldestRetained, today, future},
		now,
	))

	require.NoError(t, db.PersistScrapedMenu(
		[]models.WeeklyItem{
			menuItem(today, "Replacement", "Allison"),
			menuItem(today, "Replacement", "Allison"),
		},
		[]models.AllDataItem{{Name: "Replacement"}, {Name: "Replacement"}},
		[]string{today},
		now,
	))

	items, err := db.GetAllWeeklyItems()
	require.NoError(t, err)
	assert.NotContains(t, items, tooOld)
	require.Len(t, items[oldestRetained], 1)
	require.Len(t, items[today], 1)
	assert.Equal(t, "Replacement", items[today][0].Name)
	require.Len(t, items[future], 1)

	allItems, err := db.GetAllDataItems()
	require.NoError(t, err)
	assert.ElementsMatch(t, []models.AllDataItem{{Name: "Old today item"}, {Name: "Replacement"}}, allItems)
}

func TestPersistScrapedMenuCanReplaceClosedDate(t *testing.T) {
	setupTestDB(t)
	now := time.Date(2026, time.July, 10, 12, 0, 0, 0, time.UTC)
	date := now.Format("2006-01-02")

	require.NoError(t, db.PersistScrapedMenu(
		[]models.WeeklyItem{menuItem(date, "Existing", "Allison")},
		nil,
		[]string{date},
		now,
	))
	require.NoError(t, db.PersistScrapedMenu(nil, nil, []string{date}, now))

	items, err := db.GetAllWeeklyItems()
	assert.ErrorIs(t, err, db.NoItemsInDB)
	assert.Nil(t, items)
}

func TestPersistScrapedMenuRollsBackOnInsertFailure(t *testing.T) {
	testDB := setupTestDB(t)
	now := time.Date(2026, time.July, 10, 12, 0, 0, 0, time.UTC)
	date := now.Format("2006-01-02")

	require.NoError(t, db.PersistScrapedMenu(
		[]models.WeeklyItem{menuItem(date, "Existing", "Allison")},
		nil,
		[]string{date},
		now,
	))
	require.NoError(t, testDB.Migrator().DropTable(&db.GormAllDataItem{}))

	err := db.PersistScrapedMenu(
		[]models.WeeklyItem{menuItem(date, "Replacement", "Allison")},
		[]models.AllDataItem{{Name: "Replacement"}},
		[]string{date},
		now,
	)
	require.Error(t, err)

	items, getErr := db.GetAllWeeklyItems()
	require.NoError(t, getErr)
	require.Len(t, items[date], 1)
	assert.Equal(t, "Existing", items[date][0].Name)
}

func TestAvailableFavoritesUsesActualDate(t *testing.T) {
	setupTestDB(t)
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	require.NoError(t, db.PersistScrapedMenu(
		[]models.WeeklyItem{
			menuItem(today, "Bacon", "Allison"),
			menuItem(today, "Bacon", "Sargent"),
			menuItem(yesterday, "Eggs", "Allison"),
		},
		nil,
		[]string{today, yesterday},
		time.Now(),
	))
	require.NoError(t, db.SaveUserPreferences("test-user", []models.AllDataItem{{Name: "Bacon"}, {Name: "Eggs"}}))

	favorites, err := db.GetAvailableFavoritesBatch("test-user")
	require.NoError(t, err)
	require.Len(t, favorites, 2)
	assert.Equal(t, "Bacon", favorites[0].Name)
	assert.Equal(t, "Bacon", favorites[1].Name)
}

func TestReplaceLocationOperatingTimes(t *testing.T) {
	setupTestDB(t)
	first := []models.LocationOperatingTimes{{Name: "Allison", Week: []models.DailyOperatingTimes{{Date: "2026-07-10"}}}}
	second := []models.LocationOperatingTimes{{Name: "Sargent", Week: []models.DailyOperatingTimes{{Date: "2026-07-11"}}}}

	require.NoError(t, db.ReplaceLocationOperatingTimes(first))
	require.NoError(t, db.ReplaceLocationOperatingTimes(second))

	locations, err := db.GetLocationOperatingTimes()
	require.NoError(t, err)
	require.Len(t, locations, 1)
	assert.Equal(t, second[0], locations[0])
}

func TestUserAndDisplayPreferences(t *testing.T) {
	setupTestDB(t)
	userID := "test-user"
	favorites := []models.AllDataItem{{Name: "Bacon"}, {Name: "Eggs"}}

	require.NoError(t, db.SaveUserPreferences(userID, favorites))
	savedFavorites, err := db.GetUserPreferences(userID)
	require.NoError(t, err)
	assert.Equal(t, favorites, savedFavorites)

	initial := models.DisplayPreferences{VisibleLocations: []string{"Allison", "Plex East"}}
	require.NoError(t, db.SaveDisplayPreferences(userID, initial))
	savedDisplay, hasSaved, err := db.GetDisplayPreferences(userID)
	require.NoError(t, err)
	assert.True(t, hasSaved)
	assert.Equal(t, initial, savedDisplay)

	updated := models.DisplayPreferences{VisibleLocations: []string{"Sargent", "Elder"}}
	require.NoError(t, db.SaveDisplayPreferences(userID, updated))
	savedDisplay, hasSaved, err = db.GetDisplayPreferences(userID)
	require.NoError(t, err)
	assert.True(t, hasSaved)
	assert.Equal(t, updated, savedDisplay)
}

func TestDeleteUserData(t *testing.T) {
	setupTestDB(t)
	userID := "delete-me"
	otherUser := "keep-me"

	require.NoError(t, db.SaveUserPreferences(userID, []models.AllDataItem{{Name: "Bacon"}}))
	require.NoError(t, db.SaveNutritionGoals(userID, models.NutritionGoals{Calories: 2000, Protein: 100, Carbs: 200, Fat: 70}))
	require.NoError(t, db.SaveUserPreferences(otherUser, []models.AllDataItem{{Name: "Eggs"}}))
	require.NoError(t, db.SaveNutritionGoals(otherUser, models.NutritionGoals{Calories: 1800, Protein: 90, Carbs: 180, Fat: 60}))

	require.NoError(t, db.DeleteUserData(userID))

	// The deleted user's data is gone.
	_, err := db.GetUserPreferences(userID)
	assert.ErrorIs(t, err, db.NoUserPreferencesInDB)
	_, err = db.GetNutritionGoals(userID)
	assert.ErrorIs(t, err, db.NoUserGoalsInDB)

	// Other users are unaffected.
	otherFavorites, err := db.GetUserPreferences(otherUser)
	require.NoError(t, err)
	assert.Equal(t, []models.AllDataItem{{Name: "Eggs"}}, otherFavorites)
	otherGoals, err := db.GetNutritionGoals(otherUser)
	require.NoError(t, err)
	assert.Equal(t, models.NutritionGoals{Calories: 1800, Protein: 90, Carbs: 180, Fat: 60}, otherGoals)
}

func TestDeleteUserDataNoRowsIsNotAnError(t *testing.T) {
	setupTestDB(t)

	// Deleting a user with no stored data should succeed.
	require.NoError(t, db.DeleteUserData("user-with-no-data"))
}

func TestDisplayPreferencesNotFound(t *testing.T) {
	setupTestDB(t)

	preferences, hasSaved, err := db.GetDisplayPreferences("unknown-user")
	require.NoError(t, err)
	assert.False(t, hasSaved)
	assert.Empty(t, preferences.VisibleLocations)
}

func TestInsertAllDataItemsIgnoresDuplicates(t *testing.T) {
	setupTestDB(t)

	require.NoError(t, db.InsertAllDataItems([]models.AllDataItem{
		{Name: "Eggs"},
		{Name: "Eggs"},
		{Name: " Bacon "},
		{Name: ""},
	}))
	require.NoError(t, db.InsertAllDataItems([]models.AllDataItem{{Name: "Eggs"}, {Name: "Bacon"}}))

	items, err := db.GetAllDataItems()
	require.NoError(t, err)
	assert.ElementsMatch(t, []models.AllDataItem{{Name: "Eggs"}, {Name: "Bacon"}}, items)
}

func TestMigrateDeduplicatesExistingAllDataItems(t *testing.T) {
	testDB, err := gorm.Open(sqlite.Open("file:migration-test?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, testDB.AutoMigrate(&db.GormAllDataItem{}))
	require.NoError(t, testDB.Create(&db.GormAllDataItem{AllDataItem: models.AllDataItem{Name: "Eggs"}}).Error)
	require.NoError(t, testDB.Create(&db.GormAllDataItem{AllDataItem: models.AllDataItem{Name: "Eggs"}}).Error)

	require.NoError(t, db.Migrate(testDB))

	var count int64
	require.NoError(t, testDB.Model(&db.GormAllDataItem{}).Where("name = ?", "Eggs").Count(&count).Error)
	assert.EqualValues(t, 1, count)
	assert.Error(t, testDB.Create(&db.GormAllDataItem{AllDataItem: models.AllDataItem{Name: "Eggs"}}).Error)
}
