package db

import (
	"backend/internal/models"
	"fmt"
	"time"
)

func CleanAllData(newItems []models.AllDataItem) ([]models.AllDataItem, error) {
	oldItems, err := GetAllDataItems()

	if err == NoItemsInDB {
		return newItems, nil
	} else if err != nil {
		fmt.Println("Error in the cleaning insert all data func", err)
		return nil, err
	}

	var res []models.AllDataItem

	for _, newItem := range newItems {

		found := false
		for _, oldItem := range oldItems {
			if newItem.Name == oldItem.Name {
				found = true
			}
		}

		if !found {
			res = append(res, newItem)
		}

	}

	return res, nil
}

func CreateWeeklyItemsMap(weeklyItems []models.WeeklyItem) map[string][]models.DailyItem {
	weeklyItemsMap := make(map[string][]models.DailyItem)
	for _, wItem := range weeklyItems {
		dateKey := time.Now().AddDate(0, 0, wItem.DayIndex).Format("2006-01-02")
		weeklyItemsMap[dateKey] = append(weeklyItemsMap[dateKey], wItem.DailyItem)
	}

	return weeklyItemsMap
}
