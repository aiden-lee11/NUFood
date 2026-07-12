import SwiftUI

/// One dining location's card on the Operation Hours screen (SPEC §2.3, presentation B).
///
/// Title = short/display name in the iris accent, then a single row: weekday on the left and either
/// stacked interval lines (primary color) or "Closed" (destructive) on the right — see hours-dark.png.
struct HoursLocationCard: View {
    let name: String
    let weekday: String
    let intervals: [HourlyTimes]?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(name)
                .font(.title2.weight(.bold))
                .foregroundStyle(Theme.primary)
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
