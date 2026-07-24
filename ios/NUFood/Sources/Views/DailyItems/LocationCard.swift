import SwiftUI

/// A single dining-hall card on the Daily Items screen (SPEC §2.1, §5.3).
/// Renders one accordion per visible meal. The hall name and live open/closed
/// status live in the screen's pinned section header, not on the card itself.
struct LocationCard: View {
    let location: DiningLocation
    let meals: [MealSection]
    /// Whether the hall has items at ANY meal today (post-search), not just the
    /// visible ones — a hall serving only Dinner while "Breakfast" is the visible
    /// meal must not claim "No items available" (web parity).
    let hasItems: Bool
    /// When true (active search) every station accordion renders expanded so a
    /// match is never hidden behind a collapsed folder.
    let isSearching: Bool
    /// Called when a signed-out user taps an item (present the auth prompt).
    var onRequestAuth: () -> Void

    private var isEmpty: Bool { !hasItems }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
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
                        DailyItemAccordion(
                            items: section.items,
                            isSearching: isSearching,
                            onRequestAuth: onRequestAuth
                        )
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
