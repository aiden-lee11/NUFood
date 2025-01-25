package db

import (
	"backend/internal/models"
	"fmt"
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
