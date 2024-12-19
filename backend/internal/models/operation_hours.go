package models

type OperationHoursResponseJSON struct {
	Status       string                      `json:"status"`
	Request_time float64                     `json:"request_time"`
	Records      int                         `json:"records"`
	Locations    []LocationOperationInfoJSON `json:"the_locations"`
}

type LocationOperationInfoJSON struct {
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
	Week []DayOperationInfoJSON `json:"week"`
}

type DayOperationInfoJSON struct {
	Day               int                     `json:"day"`
	Date              string                  `json:"date"`
	Status            string                  `json:"status"`
	Hours             []HourOperationInfoJSON `json:"hours"`
	Has_special_hours bool                    `json:"has_special_hours"`
	Closed            bool                    `json:"closed"`
}

type HourOperationInfoJSON struct {
	Start_hour    int `json:"start_hour"`
	Start_minutes int `json:"start_minutes"`
	End_hour      int `json:"end_hour"`
	End_minutes   int `json:"end_minutes"`
}

// Non JSON response, ie for database

type LocationOperation struct {
	Name string
	Week []DayOperation
}

type DayOperation struct {
	Day    int
	Date   string
	Status string
	Hours  []HourOperation
}

type HourOperation struct {
	StartHour    int
	StartMinutes int
	EndHour      int
	EndMinutes   int
}
