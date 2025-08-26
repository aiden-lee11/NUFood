package store

import (
	"backend/internal/models"
	"fmt"
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
		s.allData = v
	case []models.LocationOperatingTimes:
		s.locationOperatingTimes = v
	case map[string][]models.DailyItem:
		s.weeklyItems = v
	default:
		panic("Setting an unsupported type")
	}
}

func (s *MemoryStore) getAllDataItems() []models.AllDataItem {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.allData
}

func (s *MemoryStore) getLocationOperatingTimes() []models.LocationOperatingTimes {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.locationOperatingTimes
}

func (s *MemoryStore) getWeeklyItems() map[string][]models.DailyItem {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.weeklyItems
}

// Exported functions to access the global store
func GetAllDataItems() []models.AllDataItem {
	fmt.Println("Getting all data items")
	if store == nil {
		return nil
	}
	return store.getAllDataItems()
}

func GetLocationOperatingTimes() []models.LocationOperatingTimes {
	if store == nil {
		return nil
	}
	fmt.Println("Getting location operation times", store.locationOperatingTimes)
	return store.getLocationOperatingTimes()
}

func GetWeeklyItems() map[string][]models.DailyItem {
	if store == nil {
		return nil
	}
	fmt.Println("Getting weekly items", store.weeklyItems)
	return store.getWeeklyItems()
}

func Set(value any) {
	if store != nil {
		store.Set(value)
	}
}
