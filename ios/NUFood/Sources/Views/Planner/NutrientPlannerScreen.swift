import SwiftUI

/// Nutrient Planner (SPEC §2.4): build a plan from *today's* menu items and track
/// macro totals against goals. Mobile-first with "Food Items" / "My Plan" tabs.
struct NutrientPlannerScreen: View {
    @Environment(AppStore.self) private var store

    @State private var plan = PlannerModel()
    @State private var tab: PlannerTab = .foodItems
    @State private var showGoals = false

    // Food Items filter state — owned here so it survives tab switches.
    @State private var searchText = ""
    @State private var sortField: PlannerSortField = .name
    @State private var sortOrder: PlannerSortOrder = .ascending
    @State private var locationFilter = "All Locations"
    @State private var timeFilter = "All Times"
    @State private var filtersShown = true

    private var today: String { CentralTime.todayString() }

    var body: some View {
        NavigationStack {
            content
                .background(Theme.background)
                .navigationTitle("Nutrient Planner")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) { ThemeToggleButton() }
                    ToolbarItem(placement: .topBarTrailing) { AccountToolbarButton() }
                }
                .sheet(isPresented: $showGoals) {
                    NutritionGoalsSheet(current: store.nutritionGoals) { goals in
                        store.setNutritionGoals(goals)
                    }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        if store.isLoading {
            ProgressView()
                .controlSize(.large)
                .tint(Theme.primary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error = store.loadError {
            Text("Error loading data: \(error)")
                .font(.subheadline)
                .foregroundStyle(Theme.destructive)
                .multilineTextAlignment(.center)
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView {
                VStack(spacing: 20) {
                    PlannerTabSelector(selection: $tab, planCount: plan.entries.count)

                    switch tab {
                    case .foodItems:
                        PlannerFoodItemsTab(
                            today: today,
                            plan: plan,
                            searchText: $searchText,
                            sortField: $sortField,
                            sortOrder: $sortOrder,
                            locationFilter: $locationFilter,
                            timeFilter: $timeFilter,
                            filtersShown: $filtersShown
                        )
                    case .myPlan:
                        PlannerMyPlanTab(
                            plan: plan,
                            onEditGoals: { showGoals = true },
                            onAddFoodItems: {
                                withAnimation(.easeInOut(duration: 0.15)) { tab = .foodItems }
                            }
                        )
                    }
                }
                .padding(16)
            }
        }
    }
}
