import SwiftUI

// MARK: - Card container

extension View {
    /// A bordered, filled panel used to group planner sections (search/filters, totals).
    func plannerPanel() -> some View {
        self
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radiusLarge))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radiusLarge)
                    .stroke(Theme.border, lineWidth: 1)
            )
    }
}

// MARK: - Segmented tab selector

/// Custom "Food Items" | "My Plan" segmented control (SPEC §2.4 / screenshot).
/// The My Plan segment shows a count badge when the plan is non-empty.
struct PlannerTabSelector: View {
    @Binding var selection: PlannerTab
    let planCount: Int

    var body: some View {
        HStack(spacing: 4) {
            segment(.foodItems, title: "Food Items", count: nil)
            segment(.myPlan, title: "My Plan", count: planCount)
        }
        .padding(4)
        .background(Theme.secondary, in: RoundedRectangle(cornerRadius: Theme.radius + 2))
    }

    private func segment(_ tab: PlannerTab, title: String, count: Int?) -> some View {
        let isSelected = selection == tab
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) { selection = tab }
        } label: {
            HStack(spacing: 6) {
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                if let count, count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Theme.primary, in: Capsule())
                        .foregroundStyle(Theme.primaryForeground)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .foregroundStyle(isSelected ? Theme.textPrimary : Theme.textSecondary)
            .background(
                isSelected ? Theme.card : Color.clear,
                in: RoundedRectangle(cornerRadius: Theme.radius)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius)
                    .stroke(isSelected ? Theme.border : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Dropdown-style menu picker

/// A rounded menu picker matching the web's `<select>` controls in the filter panel.
struct PlannerMenuPicker: View {
    let options: [String]
    @Binding var selection: String

    var body: some View {
        Menu {
            ForEach(options, id: \.self) { option in
                Button {
                    selection = option
                } label: {
                    if option == selection {
                        Label(option, systemImage: "checkmark")
                    } else {
                        Text(option)
                    }
                }
            }
        } label: {
            HStack {
                Text(selection)
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Image(systemName: "chevron.down")
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius)
                    .stroke(Theme.border, lineWidth: 1)
            )
        }
    }
}

/// A labelled field wrapper ("Sort By" over its control, etc.).
struct PlannerLabeledField<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(Theme.textPrimary)
            content
        }
    }
}

// MARK: - Key/value macro row

/// A "Label:  value" row used in food-item and plan-item cards.
struct PlannerFieldRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
            Spacer(minLength: 12)
            Text(value)
                .font(.subheadline)
                .foregroundStyle(Theme.textPrimary)
                .multilineTextAlignment(.trailing)
        }
    }
}

// MARK: - "Added" badge

/// Filled-primary badge shown next to a selected food item's name (SPEC §2.4).
struct AddedBadge: View {
    var body: some View {
        Text("Added")
            .font(.caption)
            .fontWeight(.semibold)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Theme.primary, in: Capsule())
            .foregroundStyle(Theme.primaryForeground)
    }
}

// MARK: - Macro totals tile with progress bar

/// One tile of the "Daily Totals" grid: label, `total / goal`, a progress bar
/// (visually capped at 100%) and the true goal percentage (SPEC §2.4.2/§2.4.3, §5).
struct MacroProgressTile: View {
    let label: String
    let total: Double
    let goal: Double
    let unit: String
    let fallbackGoal: Double
    let color: Color

    // Render the raw goal even when it's 0 — a user who zeroes a goal to turn it
    // off should see "/ 0" and an empty bar (web behavior), not the default goal
    // substituted back in with fake progress. `fallbackGoal` is kept only for the
    // pathological negative-goal decode case.
    private var displayGoal: Double { goal >= 0 ? goal : fallbackGoal }
    private var percent: Int {
        guard goal > 0 else { return 0 }
        return Int((total / goal * 100).rounded())
    }
    private var fraction: CGFloat {
        max(0, min(CGFloat(percent), 100)) / 100
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(Theme.textSecondary)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(String(format: "%.1f", total) + unit)
                    .font(.headline)
                    .foregroundStyle(Theme.textPrimary)
                Text("/ " + String(format: "%.0f", displayGoal) + unit)
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)
            }
            // Two tiles share a row; a 4-digit calorie total must shrink, not "245…".
            .lineLimit(1)
            .minimumScaleFactor(0.6)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.secondary)
                    Capsule()
                        .fill(color)
                        .frame(width: geo.size.width * fraction)
                }
            }
            .frame(height: 6)

            Text("\(percent)%")
                .font(.caption2)
                .foregroundStyle(color)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.background, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius)
                .stroke(Theme.border, lineWidth: 1)
        )
    }
}
