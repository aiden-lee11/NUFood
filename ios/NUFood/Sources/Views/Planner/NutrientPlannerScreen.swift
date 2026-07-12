import SwiftUI

struct NutrientPlannerScreen: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            Text("Nutrient Planner — coming soon")
                .foregroundStyle(Theme.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.background)
                .navigationTitle("Nutrient Planner")
        }
    }
}
