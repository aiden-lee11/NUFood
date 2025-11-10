package models

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
	// id string `json:"id"`
	Name string `json:"name"`
	// mrn int `json:"mrn"`
	// rev string `json:"rev"`
	// mrn_full string `json:"mrn_full"`
	Description string `json:"desc"`
	// webtrition_id string `json:"webtrition_id"`
	// sort_order int `json:"sort_order"`
	Portion string `json:"portion"`
	// qty string `json:"qty"`
	// ingredients string `json:"ingredients"`
	Nutrients []Nutrient `json:"nutrients"`
	// filters []Filter `json:"filters"`
}

type Nutrient struct {
	// id string `json:"id"`
	Name  string `json:"name"`
	Value string `json:"value"`
	// uom string `json:"uom"`
	// value_numeric string `json:"value_numeric"`
}

type Filter struct {
	// id string `json:"id"`
	// name string `json:"name"`
	// type string `json:"type"`
	// icon boolean `json:"icon"`
	// remote_file_name string `json:"remote_file_name"`
	// sector_icon_id string `json:"sector_icon_id"`
	// custom_icon string `json:"custom_icon"`
}

// Item Struct for only data that I want to save
type DailyItem struct {
	Name        string `json:"Name"`
	Description string `json:"Description"`
	Date        string `json:"Date"`        // The date this item is available
	Location    string `json:"Location"`    // The dining hall location
	StationName string `json:"StationName"` // The station name
	TimeOfDay   string `json:"TimeOfDay"`   // The time of day this item is available
	PortionSize string `json:"portion"`     // The portion size of the item
	Calories    string `json:"calories"`
	Protein     string `json:"protein"`
	Carbs       string `json:"carbs"`
	Fat         string `json:"fat"`
}

type WeeklyItem struct {
	DailyItem DailyItem
	DayIndex  int
}

type AllDataItem struct {
	Name string
}

type PreferenceReturn struct {
	UserID      string
	Preferences []DailyItem // json encoded arrays but are stored as strings in db
}

// NutritionGoals represents user-defined nutrition goals
type NutritionGoals struct {
	Calories float64
	Protein  float64
	Carbs    float64
	Fat      float64
}
