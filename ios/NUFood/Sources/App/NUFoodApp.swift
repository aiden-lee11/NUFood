import SwiftUI

@main
struct NUFoodApp: App {
    @State private var auth: AuthManager
    @State private var store: AppStore
    @AppStorage("appearance") private var appearance: AppearanceSetting = .dark
    @Environment(\.scenePhase) private var scenePhase

    /// Whether the app has actually been backgrounded since the last foreground pass.
    /// Reopening runs .background -> .inactive -> .active, so the phase preceding
    /// .active is never .background and cannot be tested for directly.
    @State private var wasBackgrounded = false

    init() {
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
                // Returning from the background: the process was only suspended, so
                // the launch .task above does not re-run and the day never rolls over
                // on its own. Requiring a real .background visit keeps a Control Center
                // pull or an app-switcher peek (which only reach .inactive) from
                // refetching.
                .onChange(of: scenePhase) { _, newPhase in
                    switch newPhase {
                    case .background:
                        wasBackgrounded = true
                    case .active where wasBackgrounded:
                        wasBackgrounded = false
                        Task { await store.handleForeground() }
                    default:
                        break
                    }
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
        .transientErrorToast()
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
