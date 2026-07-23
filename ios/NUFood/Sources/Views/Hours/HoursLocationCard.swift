import SwiftUI

/// One dining location's card on the Operation Hours screen (SPEC §2.3, presentation B).
///
/// Title = short/display name in the iris accent, then a single row: weekday on the left and either
/// stacked interval lines (primary color) or "Closed" (destructive) on the right — see hours-dark.png.
struct HoursLocationCard: View {
    let name: String
    let weekday: String
    let intervals: [HourlyTimes]?
    /// Live open/closed state for the badge. `nil` when the selected day isn't
    /// today — "open right now" only means something on today's card.
    let isOpen: Bool?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 12) {
                Text(name)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(Theme.primary)
                Spacer(minLength: 8)
                if let isOpen {
                    OpenStatusBadge(isOpen: isOpen)
                }
            }
            .padding(.bottom, 8)

            Rectangle()
                .fill(Theme.border)
                .frame(height: 1)

            HStack(alignment: .top) {
                Text(weekday)
                    .font(.body.weight(.medium))
                    .foregroundStyle(Theme.textPrimary)
                Spacer(minLength: 12)
                hoursView
            }
            .padding(.top, 14)
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(Theme.border.opacity(0.5))
                    .frame(height: 1)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusLarge, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusLarge, style: .continuous)
                .strokeBorder(Theme.border, lineWidth: 1)
        )
    }

    @ViewBuilder
    private var hoursView: some View {
        if let intervals, !intervals.isEmpty {
            VStack(alignment: .trailing, spacing: 4) {
                ForEach(Array(intervals.enumerated()), id: \.offset) { _, interval in
                    Text(OperatingHoursLogic.intervalString(interval))
                        .font(.body.weight(.medium))
                        .foregroundStyle(Theme.primary)
                        .multilineTextAlignment(.trailing)
                }
            }
        } else {
            Text("Closed")
                .font(.body.weight(.semibold))
                .foregroundStyle(Theme.destructive)
        }
    }
}

/// Pill in a card's top-right corner: green "Open" when the location is currently
/// open, red "Closed" otherwise — lets the user see the live state at a glance
/// instead of matching the clock against the interval list themselves.
private struct OpenStatusBadge: View {
    let isOpen: Bool

    private var color: Color { isOpen ? Theme.openGreen : Theme.closedRed }

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(color)
                .frame(width: 7, height: 7)
            Text(isOpen ? "Open" : "Closed")
                .font(.caption.weight(.bold))
                .foregroundStyle(color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(color.opacity(0.15), in: Capsule())
        .overlay(Capsule().strokeBorder(color.opacity(0.35), lineWidth: 1))
        .fixedSize()
    }
}
