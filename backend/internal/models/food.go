package models

import (
	"bytes"
	"encoding/json"
)

// FlexString decodes a JSON value the API sends inconsistently as either a
// string or a number (e.g. a nutrient value of "210" or 210), always yielding a
// string. Without it, a single numeric value fails the whole menu decode.
type FlexString string

func (f *FlexString) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	if len(b) == 0 || string(b) == "null" {
		*f = ""
		return nil
	}
	if b[0] == '"' {
		var s string
		if err := json.Unmarshal(b, &s); err != nil {
			return err
		}
		*f = FlexString(s)
		return nil
	}
	*f = FlexString(b) // number: keep its literal text
	return nil
}

// Internal Structs
type Location struct {
	Name       string
	Hash       string
	Services   []Service
	DailyItems []DailyItem
}

type LocationServicesResponse struct {
	LocationId string    `json:"locationId"`
	Date       string    `json:"date"`
	Services   []Service `json:"periods"`
}

type Service struct {
	ID        string `json:"id"`
	TimeOfDay string `json:"name"`
	Slug      string `json:"slug"`
}

// API Data
type DiningHallResponse struct {
	// id int `json:"id"`
	// LocationId string  `json:locationId`
	Period Periods `json:"period"`
	Date   string  `json:"date"`
	// UpdatedAt is the upstream "last edited" stamp for this location/date/period
	// menu (RFC3339, e.g. "2026-07-27T17:04:04Z"). Period refreshes compare it
	// against the last value they saw and skip parsing and persisting when it is
	// unchanged, which is the common case between meal-time polls.
	UpdatedAt string `json:"updatedAt"`
	// ClosedOnDate reports that the hall is closed for the whole date, and Status
	// describes the hall's current service state. Both come from the /menu
	// payload and are recorded so a refresh can tell "closed" apart from "fetch
	// failed" — only the former may clear stored rows.
	ClosedOnDate bool       `json:"closedOnDate"`
	Status       MenuStatus `json:"status"`
}

// MenuStatus is the upstream service-state object on a menu response, e.g.
// {"label":"open","message":"Open. Closes at 1:30pm.","color":"green"}. It is
// an object, not a string: decoding it as a string fails the whole menu parse.
type MenuStatus struct {
	Label   string `json:"label"`
	Message string `json:"message"`
	Color   string `json:"color"`
}

type Periods struct {
	// name string `json:"name"`
	// id string `json:"id"`
	// sort_order int `json:"sort_order"`
	Categories []Category `json:"categories"`
}

type Category struct {
	// id string `json:"id"`
	Name string `json:"name"`
	// sort_order int `json:"sort_order"`
	Items []Item `json:"items"`
}

type Item struct {
	// ID is the upstream item id. It is used only as a sanity check: identical
	// IDs across a whole menu indicate a malformed payload.
	ID   string `json:"id"`
	Name string `json:"name"`
	// mrn int `json:"mrn"`
	// rev string `json:"rev"`
	// mrn_full string `json:"mrn_full"`
	Description string `json:"desc"`
	// webtrition_id string `json:"webtrition_id"`
	// sort_order int `json:"sort_order"`
	Portion string `json:"portion"`
	// qty string `json:"qty"`
	// Ingredients is the upstream ingredient statement, a single comma separated
	// string (e.g. "Chicken, Barbecue Sauce^, Canola Oil").
	Ingredients string     `json:"ingredients"`
	Nutrients   []Nutrient `json:"nutrients"`
	// Filters carries allergen/diet/marketing tags. Only the name is consumed.
	Filters []Filter `json:"filters"`
}

type Nutrient struct {
	// id string `json:"id"`
	Name  string     `json:"name"`
	Value FlexString `json:"value"`
	// uom string `json:"uom"`
	// value_numeric string `json:"value_numeric"`
}

// Filter is one upstream allergen/diet/marketing tag on a menu item. The
// upstream object carries id/icon/remoteFileName/sectorIconId/customIcons as
// well, but only the name is meaningful to clients. A trailing "*" on the name
// means "may contain" (e.g. "Sesame*").
type Filter struct {
	Name string `json:"name"`
}

// Item Struct for only data that I want to save
type DailyItem struct {
	Name        string `json:"Name"`
	Description string `json:"Description"`
	Date        string `json:"Date" gorm:"index"` // The date this item is available
	Location    string `json:"Location"`          // The dining hall location
	StationName string `json:"StationName"`       // The station name
	TimeOfDay   string `json:"TimeOfDay"`         // The time of day this item is available
	PortionSize string `json:"portion"`           // The portion size of the item
	Calories    string `json:"calories"`
	Protein     string `json:"protein"`
	Carbs       string `json:"carbs"`
	Fat         string `json:"fat"`
	// Ingredients is the upstream ingredient statement for the item.
	Ingredients string `json:"ingredients"`
	// Filters holds the upstream tag names (allergens, diets and marketing
	// callouts) verbatim, including "may contain" variants such as "Sesame*".
	// Clients decide how to categorize them. Stored as a JSON text column.
	Filters []string `json:"filters" gorm:"serializer:json"`
}

type WeeklyItem struct {
	DailyItem DailyItem
	// DayIndex is retained for database migration compatibility. New code uses
	// DailyItem.Date as the source of truth.
	DayIndex int
}

type AllDataItem struct {
	Name string
}

type PreferenceReturn struct {
	UserID      string
	Preferences []DailyItem // json encoded arrays but are stored as strings in db
}

type DisplayPreferences struct {
	VisibleLocations []string `json:"visibleLocations"`
}

// NutritionGoals represents user-defined nutrition goals
type NutritionGoals struct {
	Calories float64
	Protein  float64
	Carbs    float64
	Fat      float64
}
