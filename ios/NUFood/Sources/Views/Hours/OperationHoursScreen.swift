import SwiftUI

struct OperationHoursScreen: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            Text("Operation Hours — coming soon")
                .foregroundStyle(Theme.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.background)
                .navigationTitle("Operation Hours")
        }
    }
}
