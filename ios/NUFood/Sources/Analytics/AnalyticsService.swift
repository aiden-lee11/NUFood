import FirebaseAnalytics
import FirebaseCore
import SwiftUI

/// Firebase Analytics, wrapped so the rest of the app never touches the SDK directly.
///
/// Two reasons for the wrapper:
///   * `GoogleService-Info.plist` is gitignored and `AppDelegate.configureFirebaseIfNeeded()`
///     deliberately skips configuration when it is absent, so the app still runs without it.
///     Every call therefore goes through the `FirebaseApp.app()` guard in `log(_:_:)`.
///   * Event and parameter names are spelled once, here, rather than as literals scattered
///     across the views — a typo'd name is a silently lost metric that only shows up weeks
///     later in the console.
///
/// Everything below is logged from a user action (a tap, a picker commit). Nothing here may
/// be called from a `body`, a `ForEach`, or the Daily Items minute tick.
@MainActor
enum AppAnalytics {

    // MARK: - Screen views

    /// The screens worth naming in the console. SwiftUI reports its own generic class names
    /// (`NavigationStack<…>`), which are useless in a funnel, so screen_view is logged by
    /// hand — see `View.trackScreen(_:)` and `RootView`.
    enum Screen: String {
        case dailyItems = "DailyItems"
        case allItems = "AllItems"
        case hours = "Hours"
        case planner = "Planner"
        case favorites = "Favorites"
    }

    /// The last screen reported, so a repeat of the *same* screen is dropped.
    ///
    /// Load-bearing: a tab switch can reach us twice (the `RootView` selection observer and
    /// the destination's own `.onAppear`, whose refire behaviour inside a `TabView` differs
    /// by iOS version), and re-entering an already-visible screen is not a new view. Because
    /// consecutive tab switches always carry a different name, real navigation still logs.
    private static var lastScreen: Screen?

    static func screenView(_ screen: Screen) {
        guard lastScreen != screen else { return }
        lastScreen = screen
        log(AnalyticsEventScreenView, [
            AnalyticsParameterScreenName: screen.rawValue,
            AnalyticsParameterScreenClass: screen.rawValue
        ])
    }

    // MARK: - Daily Items

    /// A station folder was opened on a dining hall's card (collapsing logs nothing).
    static func locationExpanded(location: String, station: String) {
        log("location_expanded", ["location": location, "station": station])
    }

    /// The Daily Items date was moved off the day it was showing. `offset_days` is signed and
    /// relative to today, which is the interesting part (how far ahead people plan) and keeps
    /// the parameter bounded to the loaded menu window.
    static func dateChanged(offsetDays: Int) {
        log("date_changed", ["offset_days": offsetDays])
    }

    // MARK: - Favorites

    /// Favoriting carries the item name on purpose: the point is the year-end "most favorited
    /// foods" roll-up. Menu item names are public dining-hall data, not user data.
    /// `location` is only present when the tap happened somewhere that knows the hall
    /// (Daily Items / the nutrition sheet), not on All Items or Your Favorites.
    static func favoriteAdded(item: String, location: String?) {
        log("favorite_added", favoriteParameters(item: item, location: location))
    }

    static func favoriteRemoved(item: String, location: String?) {
        log("favorite_removed", favoriteParameters(item: item, location: location))
    }

    private static func favoriteParameters(item: String, location: String?) -> [String: Any] {
        var parameters: [String: Any] = [AnalyticsParameterItemName: item]
        if let location { parameters["location"] = location }
        return parameters
    }

    // MARK: - Dietary profile

    /// Which half of the dietary profile the user touched. Only the category is reported —
    /// the selected diets/allergens themselves are health information and stay on the device.
    enum DietaryFilter: String {
        case diet
        case allergen
        case mayContain = "may_contain"
        case conflictMode = "conflict_mode"
    }

    static func dietaryFilterChanged(_ filter: DietaryFilter, action: String) {
        log("dietary_filter_changed", ["filter": filter.rawValue, "action": action])
    }

    // MARK: - Planner

    /// An item was added to the plan (removals are not tracked).
    static func plannerItemAdded(location: String, meal: String) {
        log("planner_item_added", ["location": location, "meal": meal])
    }

    // MARK: - Plumbing

    private static func log(_ name: String, _ parameters: [String: Any]) {
        // No plist → no configured FirebaseApp (see `AppDelegate`); logging would be a crash.
        guard FirebaseApp.app() != nil else { return }
        Analytics.logEvent(name, parameters: parameters)
    }
}

extension View {
    /// Reports a `screen_view` when this screen appears. Deduped against the previous screen
    /// by `AppAnalytics.screenView(_:)`, so pairing it with the tab-selection observer in
    /// `RootView` cannot double-count.
    func trackScreen(_ screen: AppAnalytics.Screen) -> some View {
        onAppear { AppAnalytics.screenView(screen) }
    }
}
