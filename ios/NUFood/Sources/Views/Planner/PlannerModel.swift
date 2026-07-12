import Foundation
import SwiftUI

// MARK: - Planner tabs & sort options

/// The two mobile tabs of the Nutrient Planner (SPEC §2.4).
enum PlannerTab: Hashable {
    case foodItems
    case myPlan
}

/// "Sort By" options for the Food Items list (SPEC §2.4 FoodItemsList).
enum PlannerSortField: String, CaseIterable, Identifiable {
    case name = "Name"
    case calories = "Calories"
    case protein = "Protein"
    case carbs = "Carbs"
    case fat = "Fat"

    var id: String { rawValue }
}

/// "Order" options for the Food Items list.
enum PlannerSortOrder: String, CaseIterable, Identifiable {
    case ascending = "Ascending"
    case descending = "Descending"

    var id: String { rawValue }
}

// MARK: - Planner selection identity

extension DailyItem {
    /// Selection identity for the planner: (Name, Location, TimeOfDay, Date) — SPEC §2.4.1.
    /// Note this intentionally excludes StationName (unlike `DailyItem.id`).
    var plannerKey: String { "\(name)|\(location)|\(timeOfDay)|\(date)" }
}

// MARK: - Planner state model

/// Holds the user's selected plan items with quantities and persists them.
///
/// Persistence (SPEC §2.4.5): the web keeps selected items in `sessionStorage`
/// keyed to "today". iOS has no session concept, so we persist the full plan to
/// `UserDefaults` tagged with the Central-time date it was built for, and clear it
/// on restore when that date is no longer today. This mirrors the web's
/// "plan belongs to today's items" behavior while surviving app relaunches
/// within the same day.
@Observable
@MainActor
final class PlannerModel {
    /// One selected item + its quantity. Stores the full `DailyItem` so scaled
    /// macros render even if the underlying menu is refetched.
    struct Entry: Codable, Identifiable, Hashable {
        var item: DailyItem
        var quantity: Int

        var id: String { item.plannerKey }
    }

    private(set) var entries: [Entry] = []

    private static let storageKey = "nufood.nutrientplannerItems"

    private struct Persisted: Codable {
        var date: String
        var entries: [Entry]
    }

    init() {
        restore()
    }

    // MARK: Selection

    func isSelected(_ item: DailyItem) -> Bool {
        entries.contains { $0.item.plannerKey == item.plannerKey }
    }

    /// Tap toggles selection: add with quantity 1, or remove (SPEC §2.4.1).
    func toggle(_ item: DailyItem) {
        if let index = entries.firstIndex(where: { $0.item.plannerKey == item.plannerKey }) {
            entries.remove(at: index)
        } else {
            entries.append(Entry(item: item, quantity: 1))
        }
        persist()
    }

    func increment(_ entry: Entry) {
        guard let index = entries.firstIndex(where: { $0.id == entry.id }) else { return }
        entries[index].quantity += 1
        persist()
    }

    /// Quantity floor is 1 (SPEC §2.4.1 `Math.max(1, …)`); use `remove` to delete.
    func decrement(_ entry: Entry) {
        guard let index = entries.firstIndex(where: { $0.id == entry.id }) else { return }
        entries[index].quantity = max(1, entries[index].quantity - 1)
        persist()
    }

    func remove(_ entry: Entry) {
        entries.removeAll { $0.id == entry.id }
        persist()
    }

    func clearAll() {
        entries.removeAll()
        persist()
    }

    // MARK: Totals (SPEC §2.4.2)

    /// Sum of each macro × quantity; junk/missing values contribute 0.
    var totals: (calories: Double, protein: Double, carbs: Double, fat: Double) {
        var calories = 0.0, protein = 0.0, carbs = 0.0, fat = 0.0
        for entry in entries {
            let quantity = Double(entry.quantity)
            calories += (entry.item.caloriesValue ?? 0) * quantity
            protein += (entry.item.proteinValue ?? 0) * quantity
            carbs += (entry.item.carbsValue ?? 0) * quantity
            fat += (entry.item.fatValue ?? 0) * quantity
        }
        return (calories, protein, carbs, fat)
    }

    // MARK: Persistence

    private func restore() {
        let today = CentralTime.todayString()
        guard
            let data = UserDefaults.standard.data(forKey: Self.storageKey),
            let saved = try? JSONDecoder().decode(Persisted.self, from: data)
        else { return }

        if saved.date == today {
            entries = saved.entries
        } else {
            // Plan belonged to a previous day — drop it (parity with today-keyed web plan).
            UserDefaults.standard.removeObject(forKey: Self.storageKey)
        }
    }

    private func persist() {
        let payload = Persisted(date: CentralTime.todayString(), entries: entries)
        if let data = try? JSONEncoder().encode(payload) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
    }
}

// MARK: - Goal percentage helper (SPEC §2.4.3)

enum PlannerGoals {
    /// `round(value / goal * 100)`; falls back to the default goal when `goal <= 0`.
    static func percentage(value: Double, goal: Double, fallback: Double) -> Int {
        let denominator = goal > 0 ? goal : fallback
        guard denominator > 0 else { return 0 }
        return Int((value / denominator * 100).rounded())
    }
}
