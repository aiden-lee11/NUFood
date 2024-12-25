package models

type LocationOperationsResponse struct {
	Status      string                  `json:"status"`
	RequestTime float64                 `json:"request_time"`
	Records     int                     `json:"records"`
	Locations   []LocationOperatingInfo `json:"the_locations"`
}

type LocationOperatingInfo struct {
	ID     string `json:"id"`
	Active bool   `json:"active"`
	// HasDeliveryRobots      bool                `json:"has_delivery_robots"`
	// HasFoodLockers         bool                `json:"has_food_lockers"`
	// IsDelivery             bool                `json:"is_delivery"`
	// IsDeliveryOnly         bool                `json:"is_delivery_only"`
	// IsDineIn               bool                `json:"is_dine_in"`
	// IsMobile               bool                `json:"is_mobile"`
	// IsMobileOnly           bool                `json:"is_mobile_only"`
	// IsOpenLate             bool                `json:"is_open_late"`
	// IsTakeoutOnly          bool                `json:"is_takeout_only"`
	// Occupancy              string              `json:"occupancy"`
	// PayWithApplePay        bool                `json:"pay_with_apple_pay"`
	// PayWithCash            bool                `json:"pay_with_cash"`
	// PayWithCC              bool                `json:"pay_with_cc"`
	// PayWithDiningDollars   bool                `json:"pay_with_dining_dollars"`
	// PayWithGooglePay       bool                `json:"pay_with_google_pay"`
	// PayWithMealExchange    bool                `json:"pay_with_meal_exchange"`
	// PayWithMealTrade       bool                `json:"pay_with_meal_trade"`
	// PayWithMealSwipe       bool                `json:"pay_with_meal_swipe"`
	// PayWithRetailSwipe     bool                `json:"pay_with_retail_swipe"`
	// PayWithSamsungPay      bool                `json:"pay_with_samsung_pay"`
	// PayWithMealPlan        bool                `json:"pay_with_meal_plan"`
	Name string `json:"name"`
	// sort_order             int                 `json:"sort_order"`
	// is_building           bool                `json:"is_building"`
	// building_id	   string              `json:"building_id"`
	Week []DailyOperatingInfo `json:"week"`
}

type DailyOperatingInfo struct {
	Day             int                   `json:"day"`
	Date            string                `json:"date"`
	Status          string                `json:"status"`
	Hours           []HourlyOperatingInfo `json:"hours"`
	HasSpecialHours bool                  `json:"has_special_hours"`
	Closed          bool                  `json:"closed"`
}

type HourlyOperatingInfo struct {
	StartHour    int `json:"start_hour"`
	StartMinutes int `json:"start_minutes"`
	EndHour      int `json:"end_hour"`
	EndMinutes   int `json:"end_minutes"`
}

type LocationOperatingTimes struct {
	Name string
	Week []DailyOperatingTimes
}

type DailyOperatingTimes struct {
	Day    int
	Date   string
	Status string
	Hours  []HourlyTimes
}

type HourlyTimes struct {
	StartHour    int
	StartMinutes int
	EndHour      int
	EndMinutes   int
}
