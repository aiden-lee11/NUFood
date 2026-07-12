import SwiftUI

@main
struct NUFoodApp: App {
    @State private var auth: AuthManager
    @State private var store: AppStore
    @AppStorage("appearance") private var appearance: AppearanceSetting = .dark

    init() {
        // Session-scoped like the web's sessionStorage: a user who dismissed the
        // onboarding Display Settings sheet without saving prefs is re-prompted
        // on the next launch (the sheet itself still guards on saved prefs).
        UserDefaults.standard.removeObject(forKey: "displaySettingsSeen")

        let auth = AuthManager()
        _auth = State(initialValue: auth)
        _store = State(initialValue: AppStore(auth: auth))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .environment(store)
                // Theme is applied to the UIKit windows (with a cross-dissolve on
                // change) rather than preferredColorScheme, which cannot animate.
                .onAppear { appearance.apply(animated: false) }
                .onChange(of: appearance) { _, newValue in
                    newValue.apply(animated: true)
                }
                .tint(Theme.primary)
                .onOpenURL { url in
                    _ = auth.handle(url: url)
                }
                .task {
                    await auth.waitUntilResolved()
                    await store.loadIfNeeded()
                }
                .onChange(of: auth.isSignedIn) {
                    Task { await store.loadIfNeeded() }
                }
        }
    }
}

enum AppTab: String {
    case daily, all, hours, planner, favorites
}

struct RootView: View {
    @Environment(AuthManager.self) private var auth
    @State private var selection: AppTab = .daily

    var body: some View {
        TabView(selection: $selection) {
            DailyItemsScreen()
                .tabItem { Label("Daily Items", systemImage: "house") }
                .tag(AppTab.daily)
            AllItemsScreen()
                .tabItem { Label("All Items", systemImage: "checklist") }
                .tag(AppTab.all)
            OperationHoursScreen()
                .tabItem { Label("Hours", systemImage: "calendar") }
                .tag(AppTab.hours)
            NutrientPlannerScreen()
                .tabItem { Label("Planner", systemImage: "chart.pie") }
                .tag(AppTab.planner)
            // Matches web: "Your Favorites" nav item only exists when signed in.
            if auth.isSignedIn {
                FavoritesScreen()
                    .tabItem { Label("Favorites", systemImage: "heart") }
                    .tag(AppTab.favorites)
            }
        }
        .onAppear {
            // Dev affordance: `simctl launch ... -initialTab hours` lands in
            // UserDefaults and preselects a tab (used for automated screenshots).
            if let raw = UserDefaults.standard.string(forKey: "initialTab"),
               let tab = AppTab(rawValue: raw) {
                selection = tab
            }
        }
    }
}
