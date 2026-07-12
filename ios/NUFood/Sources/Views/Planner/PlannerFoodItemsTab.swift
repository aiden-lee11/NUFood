import SwiftUI

/// Food Items tab: search + collapsible filters over today's menu, and a list of
/// tappable food-item cards that add/remove items from the plan (SPEC §2.4 left column).
struct PlannerFoodItemsTab: View {
    @Environment(AppStore.self) private var store

    let today: String
    let plan: PlannerModel

    @Binding var searchText: String
    @Binding var sortField: PlannerSortField
    @Binding var sortOrder: PlannerSortOrder
    @Binding var locationFilter: String
    @Binding var timeFilter: String
    @Binding var filtersShown: Bool

    var body: some View {
        VStack(spacing: 16) {
            controls
            itemList
        }
    }

    // MARK: Search + filters panel

    private var controls: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Theme.textSecondary)
                    TextField("Search food items...", text: $searchText)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .foregroundStyle(Theme.textPrimary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Theme.background, in: RoundedRectangle(cornerRadius: Theme.radius))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.radius)
                        .stroke(Theme.border, lineWidth: 1)
                )

                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { filtersShown.toggle() }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease")
                        .font(.headline)
                        .frame(width: 48, height: 48)
                        .foregroundStyle(filtersShown ? Theme.primaryForeground : Theme.textPrimary)
                        .background(
                            filtersShown ? Theme.primary : Theme.background,
                            in: RoundedRectangle(cornerRadius: Theme.radius)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.radius)
                                .stroke(filtersShown ? Color.clear : Theme.border, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Toggle filters")
            }

            if filtersShown {
                filtersPanel
            }
        }
        .plannerPanel()
    }

    private var filtersPanel: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                PlannerLabeledField(label: "Sort By") {
                    PlannerMenuPicker(
                        options: PlannerSortField.allCases.map(\.rawValue),
                        selection: Binding(
                            get: { sortField.rawValue },
                            set: { sortField = PlannerSortField(rawValue: $0) ?? .name }
                        )
                    )
                }
                PlannerLabeledField(label: "Order") {
                    PlannerMenuPicker(
                        options: PlannerSortOrder.allCases.map(\.rawValue),
                        selection: Binding(
                            get: { sortOrder.rawValue },
                            set: { sortOrder = PlannerSortOrder(rawValue: $0) ?? .ascending }
                        )
                    )
                }
            }

            PlannerLabeledField(label: "Filter by Location") {
                PlannerMenuPicker(options: locationOptions, selection: $locationFilter)
            }

            PlannerLabeledField(label: "Filter by Time of Day") {
                PlannerMenuPicker(options: timeOptions, selection: $timeFilter)
            }
        }
    }

    // MARK: Item list

    @ViewBuilder
    private var itemList: some View {
        let items = filteredItems
        if items.isEmpty {
            Text("No food items match your search criteria.")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
        } else {
            LazyVStack(spacing: 12) {
                ForEach(items) { item in
                    PlannerFoodItemRow(
                        item: item,
                        isSelected: plan.isSelected(item)
                    ) {
                        withAnimation(.easeInOut(duration: 0.15)) { plan.toggle(item) }
                    }
                }
            }
        }
    }

    // MARK: Derivations

    private var todaysItems: [DailyItem] {
        // Web parity: the planner browses the full day's menu, ignoring the
        // Daily Items screen's visible-locations display preference.
        store.weeklyItems[today] ?? []
    }

    /// "All Locations" + the canonical-ordered locations present in today's menu.
    /// Locations the app doesn't know about are appended so they stay filterable.
    private var locationOptions: [String] {
        let present = Set(todaysItems.map(\.location))
        let known = DiningLocation.allNames.filter { present.contains($0) }
        let unknown = present.subtracting(DiningLocation.allNames).sorted()
        return ["All Locations"] + known + unknown
    }

    /// "All Times" + the meal periods present, ordered Breakfast/Lunch/Dinner.
    /// Unrecognized periods (e.g. a future "Late Night") are appended, matching the web.
    private var timeOptions: [String] {
        let present = Set(todaysItems.map(\.timeOfDay))
        let known = mealPeriodOrder.filter { present.contains($0) }
        let unknown = present.subtracting(mealPeriodOrder).sorted()
        return ["All Times"] + known + unknown
    }

    private var filteredItems: [DailyItem] {
        var items = todaysItems

        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !query.isEmpty {
            items = items.filter { $0.name.localizedCaseInsensitiveContains(query) }
        }
        if locationFilter != "All Locations" {
            items = items.filter { $0.location == locationFilter }
        }
        if timeFilter != "All Times" {
            items = items.filter { $0.timeOfDay == timeFilter }
        }

        items.sort { lhs, rhs in
            let ascending: Bool
            switch sortField {
            case .name:
                ascending = lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
            case .calories:
                ascending = (lhs.caloriesValue ?? 0) < (rhs.caloriesValue ?? 0)
            case .protein:
                ascending = (lhs.proteinValue ?? 0) < (rhs.proteinValue ?? 0)
            case .carbs:
                ascending = (lhs.carbsValue ?? 0) < (rhs.carbsValue ?? 0)
            case .fat:
                ascending = (lhs.fatValue ?? 0) < (rhs.fatValue ?? 0)
            }
            return sortOrder == .ascending ? ascending : !ascending
        }
        return items
    }
}

// MARK: - Food item card

/// A tappable food-item card. Selected → item-selected fill, primary border, "Added" badge.
private struct PlannerFoodItemRow: View {
    let item: DailyItem
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(item.name)
                        .font(.headline)
                        .foregroundStyle(isSelected ? Theme.itemSelectedText : Theme.textPrimary)
                    if isSelected {
                        AddedBadge()
                    }
                    Spacer(minLength: 0)
                }

                Text("\(item.location) (\(item.timeOfDay))")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)

                VStack(spacing: 4) {
                    PlannerFieldRow(label: "Portion Size:", value: portionDisplay)
                    PlannerFieldRow(label: "Calories:", value: NutrientParsing.browseDisplay(item.calories))
                    PlannerFieldRow(label: "Protein:", value: NutrientParsing.browseDisplay(item.protein, unit: "g"))
                    PlannerFieldRow(label: "Carbs:", value: NutrientParsing.browseDisplay(item.carbs, unit: "g"))
                    PlannerFieldRow(label: "Fat:", value: NutrientParsing.browseDisplay(item.fat, unit: "g"))
                }
                .padding(.top, 2)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                isSelected ? Theme.itemSelected : Theme.card,
                in: RoundedRectangle(cornerRadius: Theme.radius)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius)
                    .stroke(isSelected ? Theme.primary : Theme.border, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    private var portionDisplay: String {
        let trimmed = item.portionSize.trimmingCharacters(in: .whitespaces)
        return trimmed.isEmpty ? "N/A" : trimmed
    }
}
