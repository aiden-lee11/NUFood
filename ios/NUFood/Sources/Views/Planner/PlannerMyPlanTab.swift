import SwiftUI

/// My Plan tab ("My Food Plan"): daily-totals summary vs goals, and the list of
/// selected items with quantity steppers (SPEC §2.4 right column).
struct PlannerMyPlanTab: View {
    @Environment(AppStore.self) private var store

    let plan: PlannerModel
    let onEditGoals: () -> Void
    let onAddFoodItems: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            header
            dailyTotals
            planList
        }
    }

    // MARK: Header

    private var header: some View {
        HStack(spacing: 12) {
            Text("My Food Plan")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(Theme.textPrimary)
            Spacer(minLength: 8)
            if !plan.entries.isEmpty {
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { plan.clearAll() }
                } label: {
                    Text("Clear All")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(Theme.destructive)
                }
                .buttonStyle(.plain)
            }
            Button(action: onEditGoals) {
                Label("Edit Goals", systemImage: "gearshape")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(Theme.primary)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: Daily totals

    private var dailyTotals: some View {
        let totals = plan.totals
        let goals = store.nutritionGoals
        return VStack(alignment: .leading, spacing: 12) {
            Text("Daily Totals")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)

            VStack(spacing: 10) {
                HStack(spacing: 10) {
                    MacroProgressTile(
                        label: "Calories", total: totals.calories, goal: goals.calories,
                        unit: "", fallbackGoal: 2000, color: Theme.chartLove
                    )
                    MacroProgressTile(
                        label: "Protein", total: totals.protein, goal: goals.protein,
                        unit: "g", fallbackGoal: 50, color: Theme.chartFoam
                    )
                }
                HStack(spacing: 10) {
                    MacroProgressTile(
                        label: "Carbs", total: totals.carbs, goal: goals.carbs,
                        unit: "g", fallbackGoal: 275, color: Theme.chartPine
                    )
                    MacroProgressTile(
                        label: "Fat", total: totals.fat, goal: goals.fat,
                        unit: "g", fallbackGoal: 78, color: Theme.chartGold
                    )
                }
            }
        }
        .plannerPanel()
    }

    // MARK: Plan list

    @ViewBuilder
    private var planList: some View {
        if plan.entries.isEmpty {
            VStack(spacing: 16) {
                Text("No items in your plan yet")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
                Button(action: onAddFoodItems) {
                    Text("Add Food Items")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(Theme.primaryForeground)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(Theme.primary, in: RoundedRectangle(cornerRadius: Theme.radius))
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
        } else {
            LazyVStack(spacing: 12) {
                ForEach(plan.entries) { entry in
                    PlannerPlanItemRow(
                        entry: entry,
                        onIncrement: { plan.increment(entry) },
                        onDecrement: { plan.decrement(entry) },
                        onRemove: { withAnimation(.easeInOut(duration: 0.15)) { plan.remove(entry) } }
                    )
                }
            }
        }
    }
}

// MARK: - Selected-item card

/// A selected item with quantity-scaled macros and +/−/remove controls.
private struct PlannerPlanItemRow: View {
    let entry: PlannerModel.Entry
    let onIncrement: () -> Void
    let onDecrement: () -> Void
    let onRemove: () -> Void

    private var item: DailyItem { entry.item }
    private var quantity: Double { Double(entry.quantity) }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(item.name)
                    .font(.headline)
                    .foregroundStyle(Theme.primary)
                Text("\(item.location) (\(item.timeOfDay))")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)

                VStack(spacing: 4) {
                    PlannerFieldRow(label: "Portion Size:", value: portionDisplay)
                    PlannerFieldRow(
                        label: "Calories:",
                        value: NutrientParsing.display(item.calories, quantity: quantity)
                    )
                    PlannerFieldRow(
                        label: "Protein:",
                        value: NutrientParsing.display(item.protein, quantity: quantity, unit: "g")
                    )
                    PlannerFieldRow(
                        label: "Carbs:",
                        value: NutrientParsing.display(item.carbs, quantity: quantity, unit: "g")
                    )
                    PlannerFieldRow(
                        label: "Fat:",
                        value: NutrientParsing.display(item.fat, quantity: quantity, unit: "g")
                    )
                }
                .padding(.top, 2)
            }

            Spacer(minLength: 0)

            VStack(spacing: 10) {
                HStack(spacing: 10) {
                    stepperButton(system: "minus", disabled: entry.quantity <= 1, action: onDecrement)
                    Text("\(entry.quantity)")
                        .font(.headline)
                        .foregroundStyle(Theme.textPrimary)
                        .frame(minWidth: 20)
                    stepperButton(system: "plus", disabled: false, action: onIncrement)
                }
                Button(action: onRemove) {
                    Image(systemName: "xmark")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.destructive)
                        .frame(width: 30, height: 30)
                        .overlay(Circle().stroke(Theme.destructive, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Remove \(item.name)")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius)
                .stroke(Theme.border, lineWidth: 2)
        )
    }

    private func stepperButton(system: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: system)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(disabled ? Theme.textSecondary : Theme.primaryForeground)
                .frame(width: 30, height: 30)
                .background(
                    disabled ? Theme.secondary : Theme.primary,
                    in: Circle()
                )
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }

    private var portionDisplay: String {
        let trimmed = item.portionSize.trimmingCharacters(in: .whitespaces)
        return trimmed.isEmpty ? "N/A" : trimmed
    }
}
