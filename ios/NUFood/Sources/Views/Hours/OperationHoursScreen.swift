import SwiftUI

/// Operation Hours (`/hours`) — mobile "stacked cards" presentation (SPEC §2.3, presentation B).
///
/// The web screen also has a wide-screen time-grid; SPEC §7.5 notes the exact grid pixel-merging is
/// not load-bearing, and the iPhone design (see hours-dark.png) is the stacked-card layout, so the
/// grid is intentionally omitted here.
struct OperationHoursScreen: View {
    @Environment(AppStore.self) private var store

    /// Selected day is LOCAL to this screen — the web's hours picker is independent of the menu date.
    /// Anchored to noon Central so the device-local DatePicker never renders a different calendar day.
    @State private var selectedDate: Date = OperationHoursScreen.noonToday()
    @State private var showDatePicker = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    header
                    ForEach(Self.groups) { group in
                        groupSection(group)
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Theme.background)
            .navigationTitle("Operation Hours")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    ThemeToggleButton()
                    AccountToolbarButton()
                }
            }
            // Keep the selection inside the loaded span once data arrives.
            .onChange(of: store.locationOperatingTimes.count) { _, _ in
                clampSelectedDate()
            }
            // `selectedDate` is set once at init and the process survives being
            // backgrounded, so without this it still reads yesterday on reopen.
            .onChange(of: store.syncedDay) { previousToday, _ in
                // Only advance a picker that was tracking today; a hand-picked day stays.
                if CentralTime.dateFormat.string(from: selectedDate) == previousToday {
                    selectedDate = Self.noonToday()
                }
                clampSelectedDate()
            }
        }
    }

    // MARK: - Sections

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            Text("Dining Hours")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(Theme.textPrimary)
                // Shares the row with the date pill; shrink instead of wrapping
                // on narrow screens / large type.
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 12)
            dateButton
        }
    }

    private var dateButton: some View {
        Button {
            showDatePicker = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "calendar")
                Text(Self.buttonDateFormatter.string(from: selectedDate))
            }
            .font(.subheadline.weight(.medium))
            .foregroundStyle(Theme.textPrimary)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius, style: .continuous)
                    .strokeBorder(Theme.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        // Same calendar sheet as Daily Items; a popover here collapsed the
        // graphical DatePicker to a sliver on iPhone.
        .sheet(isPresented: $showDatePicker) {
            CalendarSheet(selection: $selectedDate, range: dateRange)
        }
    }

    private func groupSection(_ group: HoursGroup) -> some View {
        let dateString = CentralTime.dateFormat.string(from: selectedDate)
        let weekday = weekdayName
        return VStack(alignment: .leading, spacing: 16) {
            Text(group.name)
                .font(.title.weight(.bold))
                .foregroundStyle(Theme.textPrimary)
            VStack(spacing: 16) {
                ForEach(group.locations, id: \.self) { location in
                    HoursLocationCard(
                        name: location,
                        weekday: weekday,
                        intervals: intervals(for: location, dateString: dateString)
                    )
                }
            }
        }
    }

    // MARK: - Day / interval resolution

    /// Intervals for a display name on the selected day, nil when closed / no data.
    private func intervals(for displayName: String, dateString: String) -> [HourlyTimes]? {
        // The five dining commons resolve through their long-name aliases.
        if let location = DiningLocation(rawValue: displayName) {
            return OperatingHoursLogic.intervals(
                in: store.locationOperatingTimes,
                location: location,
                dateString: dateString
            )
        }
        // Norris / Retail names match the record Name directly (with a fallback below).
        guard let record = record(forDisplayName: displayName) else { return nil }
        return OperatingHoursLogic.intervals(inWeek: record.week, dateString: dateString)
    }

    /// Match a Norris/Retail display name to an operating-times record.
    ///
    /// The web only matches on exact `Name`, so e.g. "847 at Fran's Cafe" (backend calls it
    /// "847 Late Night | Fran's Cafe") shows as Closed. We add containment + trailing-segment
    /// fallbacks so such records resolve; exact match is always preferred first.
    private func record(forDisplayName displayName: String) -> LocationOperatingTimes? {
        let records = store.locationOperatingTimes
        let target = normalize(displayName)

        // 1. Exact (case-insensitive, trimmed).
        if let exact = records.first(where: { normalize($0.name) == target }) {
            return exact
        }
        // 2. Containment in either direction (full names only — avoids matching tiny fragments).
        if let match = records.first(where: {
            let name = normalize($0.name)
            return name.contains(target) || target.contains(name)
        }) {
            return match
        }
        // 3. Distinctive trailing segment after "|", e.g. "… | Fran's Cafe".
        if let match = records.first(where: { record in
            guard record.name.contains("|") else { return false }
            let segment = normalize(record.name.components(separatedBy: "|").last ?? "")
            return !segment.isEmpty && (target.contains(segment) || segment.contains(target))
        }) {
            return match
        }
        return nil
    }

    private func normalize(_ string: String) -> String {
        string.lowercased().trimmingCharacters(in: .whitespaces)
    }

    // MARK: - Date span

    /// Selectable range = the Sunday→Saturday span present in the loaded records; today ±3 if empty.
    private var dateRange: ClosedRange<Date> {
        let calendar = CentralTime.calendar
        let dates = store.locationOperatingTimes
            .flatMap { $0.week }
            .compactMap { CentralTime.date(from: $0.date) }
            .sorted()
        if let first = dates.first, let last = dates.last {
            let lower = noon(first, calendar)
            let upper = noon(last, calendar)
            return lower <= upper ? lower...upper : upper...lower
        }
        let today = Self.noonToday()
        let lower = calendar.date(byAdding: .day, value: -3, to: today) ?? today
        let upper = calendar.date(byAdding: .day, value: 3, to: today) ?? today
        return lower...upper
    }

    private func clampSelectedDate() {
        let range = dateRange
        if selectedDate < range.lowerBound {
            selectedDate = range.lowerBound
        } else if selectedDate > range.upperBound {
            selectedDate = range.upperBound
        }
    }

    private var weekdayName: String {
        let index = CentralTime.calendar.component(.weekday, from: selectedDate) - 1
        guard index >= 0, index < Self.weekdayNames.count else { return "" }
        return Self.weekdayNames[index]
    }

    private func noon(_ date: Date, _ calendar: Calendar) -> Date {
        calendar.date(bySettingHour: 12, minute: 0, second: 0, of: date) ?? date
    }

    // MARK: - Static config

    private struct HoursGroup: Identifiable {
        let name: String
        let locations: [String]
        var id: String { name }
    }

    /// Groups and exact location lists per SPEC §2.3, top-to-bottom order.
    private static let groups: [HoursGroup] = [
        HoursGroup(
            name: "Dining Commons",
            locations: ["Allison", "Sargent", "Plex East", "Plex West", "Elder"]
        ),
        HoursGroup(
            name: "Norris Center",
            locations: [
                "847 Burger", "Buen Dia", "Shake Smart", "Chicken & Boba",
                "Wildcat Deli", "Starbucks", "Forno Pizza Co.", "The Market at Norris",
            ]
        ),
        HoursGroup(
            name: "Retail Dining",
            locations: [
                "Protein Bar", "847 at Fran's Cafe", "Tech Express",
                "Backlot at Kresge Cafe", "Cafe Coralie", "Lisa's Cafe",
            ]
        ),
    ]

    /// index 0 = Sunday … 6 = Saturday (SPEC §6, `getWeekday`).
    private static let weekdayNames = [
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    ]

    private static func noonToday() -> Date {
        let calendar = CentralTime.calendar
        let start = calendar.startOfDay(for: Date())
        return calendar.date(bySettingHour: 12, minute: 0, second: 0, of: start) ?? start
    }

    /// "MMM d, yyyy" → "Jul 12, 2026".
    private static let buttonDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        formatter.timeZone = CentralTime.timeZone
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()
}
