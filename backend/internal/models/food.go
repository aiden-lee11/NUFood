package models

// Internal Structs
type Location struct {
	Name       string
	Hash       string
	Services   []Service
	DailyItems []DailyItem
}

type Service struct {
	TimeOfDay string
	Hash      string
}

// API Data
type DiningHallResponse struct {
	Menu Menu `json:"menu"`
	// Status string `json:"status"`
	// request_time float `json:"request_time"`
	// records int `json:"records"`
	// allergen_filter boolean `json:"allergen_filter"`
	Closed bool `json:"closed"`
}

type Menu struct {
	// id int `json:"id"`
	// date string `json:"date"`
	// name string `json:"name"`
	// from_date string `json:"from_date"`
	// to_date string `json:"to_date"`
	Periods Periods `json:"periods"`
	Date    string  `json:"date"`
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
	// portion string `json:"portion"`
	// qty string `json:"qty"`
	// ingredients string `json:"ingredients"`
	// nutrients []Nutrient `json:"nutrients"`
	// filters []Filter `json:"filters"`
}

type Nutrient struct {
	// id string `json:"id"`
	// name string `json:"name"`
	// value string `json:"value"`
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
	Name        string
	Description string `json:"desc"`
	Date        string // The date this item is available
	Location    string // The dining hall location
	StationName string // The station name
	TimeOfDay   string // The time of day this item is available
}

type AllDataItem struct {
	Name string
}
