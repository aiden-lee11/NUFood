package store

import (
	"backend/internal/models"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMemoryStoreCopiesWeeklyItems(t *testing.T) {
	memoryStore := NewStore()
	input := map[string][]models.DailyItem{
		"2026-07-10": {{Name: "Pasta"}},
	}

	memoryStore.Set(input)
	input["2026-07-10"][0].Name = "Mutated input"

	firstRead := memoryStore.getWeeklyItems()
	assert.Equal(t, "Pasta", firstRead["2026-07-10"][0].Name)

	firstRead["2026-07-10"][0].Name = "Mutated output"
	secondRead := memoryStore.getWeeklyItems()
	assert.Equal(t, "Pasta", secondRead["2026-07-10"][0].Name)
}

func TestMemoryStoreCopiesSlices(t *testing.T) {
	memoryStore := NewStore()
	allItems := []models.AllDataItem{{Name: "Pasta"}}

	memoryStore.Set(allItems)
	allItems[0].Name = "Mutated input"

	firstRead := memoryStore.getAllDataItems()
	assert.Equal(t, "Pasta", firstRead[0].Name)

	firstRead[0].Name = "Mutated output"
	assert.Equal(t, "Pasta", memoryStore.getAllDataItems()[0].Name)
}
