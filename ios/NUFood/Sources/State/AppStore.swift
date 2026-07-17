import Foundation
import SwiftUI

/// Central observable state, mirroring the web app's zustand store.
///
/// Signed out: /api/generalData + locally persisted favorites/goals/prefs.
/// Signed in: /api/allData; mutations are optimistic locally then POSTed.
@Observable
@MainActor
final class AppStore {
    // MARK: - Server data

    private(set) var allItems: [String] = []
    private(set) var weeklyItems: [String: [DailyItem]] = [:]
    private(set) var locationOperatingTimes: [LocationOperatingTimes] = []

    // MARK: - User data

    var favorites: Set<String> = []
    var nutritionGoals: NutritionGoals = .default
    var mailing: Bool = false
    var displayPreferences: DisplayPreferences = .default

    // MARK: - UI state

    private(set) var isLoading = false
    private(set) var loadError: String?
    var selectedDate: String = CentralTime.todayString()

    /// The Central day `selectedDate` was last auto-advanced to. Lets a foreground
    /// tell "still tracking today" apart from a date the user picked by hand.
    /// Readable so screens holding their own day (Hours) can roll over off the same
    /// signal rather than each observing the scene phase.
    private(set) var syncedDay: String = CentralTime.todayString()

    /// Meal periods shown on Daily Items ("Times" tab of Display Settings).
    /// Defaults to the current meal period only; empty outside meal windows (SPEC §3.6).
    var visibleTimes: [String] = CentralTime.currentMealPeriod().map { [$0] } ?? []

    /// The meal period `visibleTimes` was last auto-set to; nil outside meal windows.
    private var syncedMeal: String? = CentralTime.currentMealPeriod()

    /// True when `initialTimes` pinned the meals for screenshots, which stops the
    /// clock from overwriting them on foreground.
    private var hasTimesOverride = false

    let auth: AuthManager
    private var api: APIClient

    init(auth: AuthManager) {
        self.auth = auth
        self.api = APIClient(tokenProvider: { [weak auth] in
            try await auth?.idToken()
        })
        restoreLocal()
        // Dev affordance: `simctl launch ... -initialDate 2026-07-10` preselects a
        // date (used for populated App Store screenshots).
        if let d = UserDefaults.standard.string(forKey: "initialDate"), !d.isEmpty {
            selectedDate = d
        }
        if let t = UserDefaults.standard.string(forKey: "initialTimes"), !t.isEmpty {
            visibleTimes = t.split(separator: ",").map { String($0) }
            hasTimesOverride = true
        }
    }

    // MARK: - Loading

    /// Loads only when the auth state changed since the last successful load
    /// (both the launch task and the auth-change observer call this; dedupes the
    /// double-fire on cold launch for signed-in users).
    func loadIfNeeded() async {
        guard loadedForSignedIn != auth.isSignedIn else { return }
        await load()
    }

    /// Re-syncs clock-derived state and refetches when the app returns from the
    /// background. Backgrounding suspends rather than terminates the process, so
    /// `selectedDate` and the menu data would otherwise stay frozen at whatever
    /// "today" meant when the app was first launched, however long ago that was.
    func handleForeground(now: Date = Date()) async {
        guard !isLoading else { return }
        let dayRolled = syncToClock(now: now)
        // loadIfNeeded() is gated on auth identity, so it cannot refresh data that
        // went stale while suspended — go straight to load().
        if dayRolled || isStale { await load() }
    }

    /// Advances the clock-derived state (shown day, shown meal) to `now`, reporting
    /// whether the Central day rolled over. Driven both by returning to the
    /// foreground and by the Daily Items minute timer, so the two cannot disagree.
    @discardableResult
    func syncToClock(now: Date = Date()) -> Bool {
        let today = CentralTime.todayString(now: now)
        let dayRolled = today != syncedDay
        if dayRolled {
            // Only advance a view that was tracking today; a hand-picked date
            // (and the `initialDate` screenshot override) stays put.
            if selectedDate == syncedDay { selectedDate = today }
            syncedDay = today
        }

        // Web parity (SPEC §3.6): the shown meal follows the clock, both across a
        // reopen and while the app sits open through 5pm. Firing only when the period
        // actually turns over lets toggles made within a meal survive.
        let meal = CentralTime.currentMealPeriod(now: now)
        if meal != syncedMeal, !hasTimesOverride {
            visibleTimes = meal.map { [$0] } ?? []
            syncedMeal = meal
        }
        return dayRolled
    }

    /// Menus are rescraped through the day, so a long-suspended session refetches
    /// even when the day has not rolled over.
    private var isStale: Bool {
        guard let lastLoadedAt else { return true }
        return Date().timeIntervalSince(lastLoadedAt) > Self.refreshInterval
    }

    private static let refreshInterval: TimeInterval = 15 * 60

    func load() async {
        isLoading = true
        loadError = nil
        defer { isLoading = false }
        do {
            if auth.isSignedIn {
                let data = try await api.fetchAllData()
                allItems = data.allItems
                weeklyItems = data.weeklyItems
                locationOperatingTimes = data.locationOperatingTimes
                nutritionGoals = data.nutritionGoals
                favorites = Set(data.userPreferences)
                mailing = data.mailing ?? false
                // Local display prefs win over the server's (SPEC §3.4): adopt the
                // server value only when nothing has been saved on this device yet.
                if !displayPreferences.hasSavedDisplayPreferences,
                   data.displayPreferences.hasSavedDisplayPreferences {
                    displayPreferences = data.displayPreferences
                }
            } else {
                let data = try await api.fetchGeneralData()
                allItems = data.allItems
                weeklyItems = data.weeklyItems
                locationOperatingTimes = data.locationOperatingTimes
                // Web parity: sign-out clears user data (display prefs survive).
                favorites = []
                mailing = false
            }
            loadedForSignedIn = auth.isSignedIn
            lastLoadedAt = Date()
        } catch {
            loadError = error.localizedDescription
        }
        persistLocal()
    }

    /// Auth state a successful load() last ran under; nil before the first load.
    private var loadedForSignedIn: Bool?

    /// When load() last succeeded; nil before the first load. Left untouched on
    /// failure so the next foreground retries instead of waiting out the interval.
    private var lastLoadedAt: Date?

    // MARK: - Mutations (optimistic; synced to backend when signed in)

    func toggleFavorite(_ name: String) {
        // Web parity (SPEC §2.1.1): compare case-insensitively and trimmed;
        // store the original-cased name when adding.
        let key = name.trimmingCharacters(in: .whitespaces).lowercased()
        let existing = favorites.filter {
            $0.trimmingCharacters(in: .whitespaces).lowercased() == key
        }
        if existing.isEmpty {
            favorites.insert(name)
        } else {
            favorites.subtract(existing)
        }
        persistLocal()
        syncIfSignedIn { try await $0.saveFavorites($1.favorites.sorted()) }
    }

    /// Batch removal (Your Favorites edit mode) — one local persist + one backend
    /// sync for the whole batch instead of per-item toggles.
    func removeFavorites(_ names: Set<String>) {
        guard !names.isEmpty else { return }
        favorites.subtract(names)
        persistLocal()
        syncIfSignedIn { try await $0.saveFavorites($1.favorites.sorted()) }
    }

    func setNutritionGoals(_ goals: NutritionGoals) {
        nutritionGoals = goals
        persistLocal()
        syncIfSignedIn { try await $0.saveNutritionGoals($1.nutritionGoals) }
    }

    func setMailing(_ value: Bool) {
        mailing = value
        syncIfSignedIn { try await $0.saveMailing($1.mailing) }
    }

    func setVisibleLocations(_ locations: [String]) {
        displayPreferences.visibleLocations = locations
        displayPreferences.hasSavedDisplayPreferences = true
        persistLocal()
        syncIfSignedIn { try await $0.saveDisplayPreferences(visibleLocations: $1.displayPreferences.visibleLocations) }
    }

    /// Permanently deletes the account (server-side data + Firebase user) and wipes
    /// every locally cached copy of user data. The Firebase auth listener flips
    /// `isSignedIn` to false once the user is deleted, which reloads general data.
    func deleteAccount() async throws {
        try await auth.deleteAccount(using: api)
        // Nothing about this account should survive on-device.
        favorites = []
        nutritionGoals = .default
        mailing = false
        displayPreferences = .default
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: Keys.favorites)
        defaults.removeObject(forKey: Keys.goals)
        defaults.removeObject(forKey: Keys.displayPrefs)
    }

    private func syncIfSignedIn(_ operation: @escaping (APIClient, AppStore) async throws -> Void) {
        guard auth.isSignedIn else { return }
        Task { [api] in
            do {
                try await operation(api, self)
            } catch {
                // Keep the optimistic local value; surface quietly in logs.
                print("Sync failed: \(error)")
            }
        }
    }

    // MARK: - Derived data

    /// Items for the selected date, restricted to visible locations.
    func items(on date: String) -> [DailyItem] {
        (weeklyItems[date] ?? []).filter {
            displayPreferences.visibleLocations.contains($0.location)
        }
    }

    /// Sorted date keys with any menu data, ascending.
    var availableDates: [String] {
        weeklyItems.keys.sorted()
    }

    /// The maximal run of consecutive dates ending at the latest available date.
    /// Menu data can have historical gaps before the first scraped date, so only
    /// this contiguous recent span (whatever past data we have, plus the future
    /// scraped days) is safe to offer for selection — older gap dates would open
    /// an empty screen. `nil` when no menu data is loaded.
    var contiguousDateRange: ClosedRange<Date>? {
        let calendar = CentralTime.calendar
        let dates = availableDates.compactMap(CentralTime.date(from:))
        guard let max = dates.last else { return nil }
        var start = max
        for date in dates.dropLast().reversed() {
            guard let expected = calendar.date(byAdding: .day, value: -1, to: start),
                  calendar.isDate(date, inSameDayAs: expected) else { break }
            start = date
        }
        return start...max
    }

    func operatingTimes(for location: DiningLocation) -> LocationOperatingTimes? {
        for alias in location.operatingTimesAliases {
            if let match = locationOperatingTimes.first(where: { $0.name == alias }) {
                return match
            }
        }
        return nil
    }

    // MARK: - Local persistence (parity with web localStorage for signed-out users)

    private enum Keys {
        static let favorites = "nufood.favorites"
        static let goals = "nufood.nutritionGoals"
        static let displayPrefs = "nufood.displayPreferences"
    }

    private func restoreLocal() {
        let defaults = UserDefaults.standard
        if let saved = defaults.stringArray(forKey: Keys.favorites) {
            favorites = Set(saved)
        }
        if let data = defaults.data(forKey: Keys.goals),
           let goals = try? JSONDecoder().decode(NutritionGoals.self, from: data) {
            nutritionGoals = goals
        }
        if let data = defaults.data(forKey: Keys.displayPrefs),
           let prefs = try? JSONDecoder().decode(DisplayPreferences.self, from: data) {
            displayPreferences = prefs
        }
    }

    private func persistLocal() {
        let defaults = UserDefaults.standard
        defaults.set(favorites.sorted(), forKey: Keys.favorites)
        if let data = try? JSONEncoder().encode(nutritionGoals) {
            defaults.set(data, forKey: Keys.goals)
        }
        if let data = try? JSONEncoder().encode(displayPreferences) {
            defaults.set(data, forKey: Keys.displayPrefs)
        }
    }
}

// MARK: - Central time helpers

/// All menu dates and operating hours are US Central time (Northwestern's campus).
enum CentralTime {
    static let timeZone = TimeZone(identifier: "America/Chicago")!

    static var calendar: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        return cal
    }

    static let dateFormat: DateFormatter = {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.timeZone = timeZone
        df.locale = Locale(identifier: "en_US_POSIX")
        return df
    }()

    static func todayString(now: Date = Date()) -> String {
        dateFormat.string(from: now)
    }

    static func date(from string: String) -> Date? {
        dateFormat.date(from: string)
    }

    /// Minutes since midnight, Central time.
    static func minutesSinceMidnight(now: Date = Date()) -> Int {
        let comps = calendar.dateComponents([.hour, .minute], from: now)
        return (comps.hour ?? 0) * 60 + (comps.minute ?? 0)
    }

    /// Current meal period by Central hour (SPEC §3.6); nil outside meal windows.
    static func currentMealPeriod(now: Date = Date()) -> String? {
        let hour = calendar.component(.hour, from: now)
        switch hour {
        case 7...10: return "Breakfast"
        case 11...16: return "Lunch"
        case 17...22: return "Dinner"
        default: return nil
        }
    }
}
