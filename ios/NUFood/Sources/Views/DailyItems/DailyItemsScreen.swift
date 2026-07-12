import SwiftUI

struct DailyItemsScreen: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            Text("Daily Items — coming soon")
                .foregroundStyle(Theme.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.background)
                .navigationTitle("Daily Items")
        }
    }
}
