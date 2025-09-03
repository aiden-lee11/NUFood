package cache

import (
	"backend/internal/models"
	"sync"
	"time"
)

// UserData represents cached user-specific data
type UserData struct {
	UserID         string
	Preferences    []models.AllDataItem
	NutritionGoals models.NutritionGoals
	Mailing        *bool
	LastUpdated    time.Time
	TTL            time.Duration
}

// IsExpired checks if the cached data has expired
func (ud *UserData) IsExpired() bool {
	return time.Since(ud.LastUpdated) > ud.TTL
}

// UserCache manages user-specific cached data
type UserCache struct {
	mu    sync.RWMutex
	users map[string]*UserData
	// Default TTL for cache entries (configurable)
	defaultTTL time.Duration
	// Maximum number of users to cache (LRU eviction)
	maxUsers int
}

// NewUserCache creates a new UserCache instance
func NewUserCache(defaultTTL time.Duration, maxUsers int) *UserCache {
	return &UserCache{
		users:      make(map[string]*UserData),
		defaultTTL: defaultTTL,
		maxUsers:   maxUsers,
	}
}

// Global user cache instance
var userCache *UserCache

// InitUserCache initializes the global user cache
// defaultTTL: how long to keep user data in cache (e.g., 30 minutes)
// maxUsers: maximum number of users to cache (e.g., 1000)
func InitUserCache(defaultTTL time.Duration, maxUsers int) {
	userCache = NewUserCache(defaultTTL, maxUsers)
}

// GetUserData retrieves cached user data if available and not expired
func (uc *UserCache) GetUserData(userID string) (*UserData, bool) {
	uc.mu.RLock()
	defer uc.mu.RUnlock()

	userData, exists := uc.users[userID]
	if !exists || userData.IsExpired() {
		// Clean up expired entry
		if exists && userData.IsExpired() {
			delete(uc.users, userID)
		}
		return nil, false
	}

	return userData, true
}

// SetUserData caches user data with default TTL
func (uc *UserCache) SetUserData(userID string, preferences []models.AllDataItem, nutritionGoals models.NutritionGoals, mailing *bool) {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	// Implement simple LRU eviction if cache is full
	if len(uc.users) >= uc.maxUsers {
		uc.evictOldestUser()
	}

	uc.users[userID] = &UserData{
		UserID:         userID,
		Preferences:    preferences,
		NutritionGoals: nutritionGoals,
		Mailing:        mailing,
		LastUpdated:    time.Now(),
		TTL:            uc.defaultTTL,
	}
}

// SetUserPreferences updates only the preferences for a user
func (uc *UserCache) SetUserPreferences(userID string, preferences []models.AllDataItem) {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	if userData, exists := uc.users[userID]; exists {
		userData.Preferences = preferences
		userData.LastUpdated = time.Now()
	}
}

// SetUserNutritionGoals updates only the nutrition goals for a user
func (uc *UserCache) SetUserNutritionGoals(userID string, goals models.NutritionGoals) {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	if userData, exists := uc.users[userID]; exists {
		userData.NutritionGoals = goals
		userData.LastUpdated = time.Now()
	}
}

// SetUserMailing updates only the mailing preference for a user
func (uc *UserCache) SetUserMailing(userID string, mailing bool) {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	if userData, exists := uc.users[userID]; exists {
		userData.Mailing = &mailing
		userData.LastUpdated = time.Now()
	}
}

// InvalidateUser removes a user's data from cache
func (uc *UserCache) InvalidateUser(userID string) {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	delete(uc.users, userID)
}

// evictOldestUser removes the user with the oldest LastUpdated time
func (uc *UserCache) evictOldestUser() {
	var oldestUserID string
	var oldestTime time.Time

	for userID, userData := range uc.users {
		if oldestUserID == "" || userData.LastUpdated.Before(oldestTime) {
			oldestUserID = userID
			oldestTime = userData.LastUpdated
		}
	}

	if oldestUserID != "" {
		delete(uc.users, oldestUserID)
	}
}

// CleanupExpired removes all expired entries from cache
func (uc *UserCache) CleanupExpired() {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	for userID, userData := range uc.users {
		if userData.IsExpired() {
			delete(uc.users, userID)
		}
	}
}

// GetCacheStats returns cache statistics
func (uc *UserCache) GetCacheStats() map[string]interface{} {
	uc.mu.RLock()
	defer uc.mu.RUnlock()

	expiredCount := 0
	for _, userData := range uc.users {
		if userData.IsExpired() {
			expiredCount++
		}
	}

	return map[string]interface{}{
		"total_users":   len(uc.users),
		"expired_users": expiredCount,
		"max_users":     uc.maxUsers,
		"default_ttl":   uc.defaultTTL.String(),
	}
}

// Global functions to work with the global cache instance

// GetUserData retrieves cached user data from the global cache
func GetUserData(userID string) (*UserData, bool) {
	if userCache == nil {
		return nil, false
	}
	return userCache.GetUserData(userID)
}

// SetUserData caches user data in the global cache
func SetUserData(userID string, preferences []models.AllDataItem, nutritionGoals models.NutritionGoals, mailing *bool) {
	if userCache != nil {
		userCache.SetUserData(userID, preferences, nutritionGoals, mailing)
	}
}

// SetUserPreferences updates user preferences in the global cache
func SetUserPreferences(userID string, preferences []models.AllDataItem) {
	if userCache != nil {
		userCache.SetUserPreferences(userID, preferences)
	}
}

// SetUserNutritionGoals updates user nutrition goals in the global cache
func SetUserNutritionGoals(userID string, goals models.NutritionGoals) {
	if userCache != nil {
		userCache.SetUserNutritionGoals(userID, goals)
	}
}

// SetUserMailing updates user mailing preference in the global cache
func SetUserMailing(userID string, mailing bool) {
	if userCache != nil {
		userCache.SetUserMailing(userID, mailing)
	}
}

// InvalidateUser removes a user from the global cache
func InvalidateUser(userID string) {
	if userCache != nil {
		userCache.InvalidateUser(userID)
	}
}

// CleanupExpired removes expired entries from the global cache
func CleanupExpired() {
	if userCache != nil {
		userCache.CleanupExpired()
	}
}

// GetCacheStats returns statistics from the global cache
func GetCacheStats() map[string]interface{} {
	if userCache == nil {
		return map[string]interface{}{"error": "cache not initialized"}
	}
	return userCache.GetCacheStats()
}

// StartCleanupRoutine starts a background goroutine to periodically clean expired entries
func StartCleanupRoutine(interval time.Duration) {
	if userCache == nil {
		return
	}

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			CleanupExpired()
		}
	}()
}
