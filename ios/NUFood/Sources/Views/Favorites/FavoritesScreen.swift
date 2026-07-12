import SwiftUI

struct FavoritesScreen: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            Text("Your Favorites — coming soon")
                .foregroundStyle(Theme.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.background)
                .navigationTitle("Your Favorites")
        }
    }
}
