import SwiftUI

/// A single dining-hall card on the Daily Items screen (SPEC §2.1, §5.3).
/// Shows the hall name, a live open/closed status line, and one accordion per visible meal.
struct LocationCard: View {
    let location: DiningLocation
    let meals: [MealSection]
    /// Whether the hall has items at ANY meal today (post-search), not just the
    /// visible ones — a hall serving only Dinner while "Breakfast" is the visible
    /// meal must not claim "No items available" (web parity).
    let hasItems: Bool
    let status: OperatingHoursLogic.LocationStatus
    /// Called when a signed-out user taps an item (present the auth prompt).
    var onRequestAuth: () -> Void

    private var isEmpty: Bool { !hasItems }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(location.rawValue)
                .font(.title2.bold())
                .foregroundStyle(Theme.textPrimary)

            Text("Status -- \(status.text)")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(status.isOpen ? Theme.openGreen : Theme.closedRed)

            if isEmpty {
                Text("No items available")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                ForEach(meals) { section in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(section.meal)
                            .font(.headline)
                            .foregroundStyle(Theme.textPrimary)
                        Divider().overlay(Theme.border)
                        DailyItemAccordion(items: section.items, onRequestAuth: onRequestAuth)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radiusLarge))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusLarge)
                .stroke(Theme.border, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.12), radius: 6, x: -3, y: 4)
        .opacity(isEmpty ? 0.75 : 1)
    }
}
