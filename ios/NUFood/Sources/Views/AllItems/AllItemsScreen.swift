import SwiftUI

struct AllItemsScreen: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            Text("All Items — coming soon")
                .foregroundStyle(Theme.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.background)
                .navigationTitle("All Items")
        }
    }
}
