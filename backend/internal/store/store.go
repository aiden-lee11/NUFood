package store

import (
	"backend/internal/models"
	"sync"
)

var store *MemoryStore

type MemoryStore struct {
	mu                     sync.RWMutex
	allData                []models.AllDataItem
	weeklyItems            map[string][]models.DailyItem
	locationOperatingTimes []models.LocationOperatingTimes
}

func InitStore() {
	store = NewStore()
}

func NewStore() *MemoryStore {
	return &MemoryStore{
		weeklyItems: make(map[string][]models.DailyItem),
	}
}

func (s *MemoryStore) Set(value any) {
	s.mu.Lock()
	defer s.mu.Unlock()

	switch v := value.(type) {
	case []models.AllDataItem:
		s.allData = append([]models.AllDataItem(nil), v...)
	case []models.LocationOperatingTimes:
		s.locationOperatingTimes = append([]models.LocationOperatingTimes(nil), v...)
	case map[string][]models.DailyItem:
		s.weeklyItems = cloneWeeklyItems(v)
	default:
		panic("Setting an unsupported type")
	}
}

// Clear resets all in-memory data structures managed by the store
func (s *MemoryStore) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.allData = nil
	s.locationOperatingTimes = nil
	s.weeklyItems = make(map[string][]models.DailyItem)
}

func (s *MemoryStore) getAllDataItems() []models.AllDataItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]models.AllDataItem(nil), s.allData...)
}

func (s *MemoryStore) getLocationOperatingTimes() []models.LocationOperatingTimes {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]models.LocationOperatingTimes(nil), s.locationOperatingTimes...)
}

func (s *MemoryStore) getWeeklyItems() map[string][]models.DailyItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneWeeklyItems(s.weeklyItems)
}

func cloneWeeklyItems(items map[string][]models.DailyItem) map[string][]models.DailyItem {
	if items == nil {
		return nil
	}
	cloned := make(map[string][]models.DailyItem, len(items))
	for date, dateItems := range items {
		cloned[date] = append([]models.DailyItem(nil), dateItems...)
	}
	return cloned
}

// Exported functions to access the global store
func GetAllDataItems() []models.AllDataItem {
	if store == nil {
		return nil
	}
	return store.getAllDataItems()
}

func GetLocationOperatingTimes() []models.LocationOperatingTimes {
	if store == nil {
		return nil
	}
	return store.getLocationOperatingTimes()
}

func GetWeeklyItems() map[string][]models.DailyItem {
	if store == nil {
		return nil
	}
	return store.getWeeklyItems()
}

func Set(value any) {
	if store != nil {
		store.Set(value)
	}
}

// Clear removes all data from the global memory store
func Clear() {
	if store != nil {
		store.Clear()
	}
}
