import SwiftUI

@main
struct NUFoodApp: App {
    @State private var auth: AuthManager
    @State private var store: AppStore
    @AppStorage("appearance") private var appearance: AppearanceSetting = .dark

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
                .preferredColorScheme(appearance.colorScheme)
                .tint(Theme.primary)
                .onOpenURL { url in
                    _ = auth.handle(url: url)
                }
                .task {
                    await store.load()
                }
                .onChange(of: auth.isSignedIn) {
                    Task { await store.load() }
                }
        }
    }
}

struct RootView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        TabView {
            DailyItemsScreen()
                .tabItem { Label("Daily Items", systemImage: "house") }
            AllItemsScreen()
                .tabItem { Label("All Items", systemImage: "checklist") }
            OperationHoursScreen()
                .tabItem { Label("Hours", systemImage: "calendar") }
            NutrientPlannerScreen()
                .tabItem { Label("Planner", systemImage: "chart.pie") }
            // Matches web: "Your Favorites" nav item only exists when signed in.
            if auth.isSignedIn {
                FavoritesScreen()
                    .tabItem { Label("Favorites", systemImage: "heart") }
            }
        }
    }
}
