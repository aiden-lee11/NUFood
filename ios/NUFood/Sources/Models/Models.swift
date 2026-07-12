import Foundation

// MARK: - Menu items

/// One food item served at a location/station/meal on a given date.
/// Mirrors the backend's models.DailyItem JSON (mixed-case keys are intentional).
struct DailyItem: Codable, Hashable, Identifiable {
    let name: String
    let description: String
    let date: String        // "yyyy-MM-dd"
    let location: String    // "Sargent", "Elder", "Allison", "Plex East", "Plex West"
    let stationName: String
    let timeOfDay: String   // "Breakfast", "Lunch", "Dinner", ...
    let portionSize: String
    let calories: String
    let protein: String
    let carbs: String
    let fat: String

    enum CodingKeys: String, CodingKey {
        case name = "Name"
        case description = "Description"
        case date = "Date"
        case location = "Location"
        case stationName = "StationName"
        case timeOfDay = "TimeOfDay"
        case portionSize = "portion"
        case calories = "calories"
        case protein = "protein"
        case carbs = "carbs"
        case fat = "fat"
    }

    var id: String { "\(date)|\(location)|\(timeOfDay)|\(stationName)|\(name)" }

    /// Parsed macros; nil when the backend value is junk ("NaN", "less than 1 gram", "", …).
    var caloriesValue: Double? { NutrientParsing.value(calories) }
    var proteinValue: Double? { NutrientParsing.value(protein) }
    var carbsValue: Double? { NutrientParsing.value(carbs) }
    var fatValue: Double? { NutrientParsing.value(fat) }
}

/// Macro strings from the scraper are messy: "220", "12g", "NaN", "NaNg", "undefined",
/// "less than 1 gram", or empty. Mirrors the web's parseFloat-based handling (SPEC §3.7):
/// leading number wins, anything else is nil and displays as "N/A".
enum NutrientParsing {
    static func value(_ raw: String?) -> Double? {
        guard let raw else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespaces)
        // Scan a leading (possibly negative, decimal) number like JS parseFloat.
        var numberText = ""
        for ch in trimmed {
            if ch.isNumber || (ch == "." && !numberText.contains(".")) || (ch == "-" && numberText.isEmpty) {
                numberText.append(ch)
            } else {
                break
            }
        }
        guard let value = Double(numberText), value.isFinite else { return nil }
        return value
    }

    /// "N/A" for junk, else `(value * quantity).toFixed(1) + unit` exactly like the web
    /// (e.g. "24.0g" — the trailing .0 is intentional web parity).
    static func display(_ raw: String?, quantity: Double = 1, unit: String = "") -> String {
        guard let value = value(raw) else { return "N/A" }
        return String(format: "%.1f", value * quantity) + unit
    }
}

// MARK: - Operating hours

struct LocationOperatingTimes: Codable, Hashable, Identifiable {
    let name: String
    let week: [DailyOperatingTimes]

    enum CodingKeys: String, CodingKey {
        case name = "Name"
        case week = "Week"
    }

    var id: String { name }
}

struct DailyOperatingTimes: Codable, Hashable {
    let day: Int
    let date: String      // "yyyy-MM-dd"
    let status: String    // "open" | "closed"
    let hours: [HourlyTimes]?

    enum CodingKeys: String, CodingKey {
        case day = "Day"
        case date = "Date"
        case status = "Status"
        case hours = "Hours"
    }
}

struct HourlyTimes: Codable, Hashable {
    let startHour: Int
    let startMinutes: Int
    let endHour: Int
    let endMinutes: Int

    enum CodingKeys: String, CodingKey {
        case startHour = "StartHour"
        case startMinutes = "StartMinutes"
        case endHour = "EndHour"
        case endMinutes = "EndMinutes"
    }
}

// MARK: - User data

struct NutritionGoals: Codable, Hashable {
    var calories: Double
    var protein: Double
    var carbs: Double
    var fat: Double

    enum CodingKeys: String, CodingKey {
        case calories = "Calories"
        case protein = "Protein"
        case carbs = "Carbs"
        case fat = "Fat"
    }

    static let `default` = NutritionGoals(calories: 2000, protein: 50, carbs: 275, fat: 78)
}

struct DisplayPreferences: Codable, Hashable {
    var visibleLocations: [String]
    var hasSavedDisplayPreferences: Bool

    enum CodingKeys: String, CodingKey {
        case visibleLocations
        case hasSavedDisplayPreferences
    }

    static let `default` = DisplayPreferences(
        visibleLocations: DiningLocation.allNames,
        hasSavedDisplayPreferences: false
    )
}

// MARK: - API responses

/// GET /api/generalData (unauthenticated)
struct GeneralDataResponse: Codable {
    let allItems: [String]
    let weeklyItems: [String: [DailyItem]]   // keyed by "yyyy-MM-dd"
    let locationOperatingTimes: [LocationOperatingTimes]
    let nutritionGoals: NutritionGoals
}

/// GET /api/allData (Firebase bearer token)
struct AllDataResponse: Codable {
    let allItems: [String]
    let weeklyItems: [String: [DailyItem]]
    let locationOperatingTimes: [LocationOperatingTimes]
    let nutritionGoals: NutritionGoals
    let userPreferences: [String]
    let mailing: Bool?
    let displayPreferences: DisplayPreferences
}

// MARK: - Dining locations

/// The five menu-serving dining commons, in canonical display order.
enum DiningLocation: String, CaseIterable, Identifiable {
    case sargent = "Sargent"
    case elder = "Elder"
    case allison = "Allison"
    case plexEast = "Plex East"
    case plexWest = "Plex West"

    var id: String { rawValue }

    static var allNames: [String] { allCases.map(\.rawValue) }

    /// Campus grouping used by the Display Settings sheet.
    var campus: Campus {
        switch self {
        case .sargent, .elder: return .north
        case .allison, .plexEast, .plexWest: return .south
        }
    }

    /// Matching names in locationOperatingTimes (long official names), tried in order.
    /// Plex West has two aliases because the scraper name changed on 4/28/2025.
    var operatingTimesAliases: [String] {
        switch self {
        case .sargent: return ["Sargent Dining Commons"]
        case .elder: return ["Elder Dining Commons"]
        case .allison: return ["Allison Dining Commons"]
        case .plexEast: return ["Foster Walker Plex East"]
        case .plexWest: return ["Foster Walker Plex West & Market", "Foster Walker Plex West"]
        }
    }

    enum Campus: String, CaseIterable {
        case north = "North Campus"
        case south = "South Campus"
    }
}

/// The three meal periods, in canonical order (SPEC §0.2).
let mealPeriodOrder: [String] = ["Breakfast", "Lunch", "Dinner"]

func mealPeriodSortKey(_ period: String) -> Int {
    mealPeriodOrder.firstIndex(of: period) ?? mealPeriodOrder.count
}
