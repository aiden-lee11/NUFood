import SwiftUI

/// Daily Items date picker (SPEC §2.1) limited to the contiguous run of loaded
/// menu dates ending at the latest available date (`store.contiguousDateRange`),
/// falling back to today ±3 days when no menu data is loaded.
struct DatePickerSheet: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        CalendarSheet(selection: dateBinding, range: selectableRange)
    }

    private var dateBinding: Binding<Date> {
        Binding(
            get: {
                let date = CentralTime.date(from: store.selectedDate) ?? Date()
                let range = selectableRange
                // Keep the picker's highlighted date inside the offered range even
                // if the current selection points at a gap/absent date.
                return min(max(date, range.lowerBound), range.upperBound)
            },
            set: { date in
                let picked = CentralTime.dateFormat.string(from: date)
                // The graphical picker also writes the day it opens on; only a real
                // move is a "date changed".
                guard picked != store.selectedDate else { return }
                store.selectedDate = picked
                AppAnalytics.dateChanged(offsetDays: offsetFromToday(picked))
            }
        )
    }

    /// Signed day distance from today ("+2" = two days ahead), which is what the funnel
    /// wants and keeps the parameter inside the loaded menu window.
    private func offsetFromToday(_ dateString: String) -> Int {
        guard
            let today = CentralTime.date(from: store.syncedDay),
            let picked = CentralTime.date(from: dateString)
        else { return 0 }
        return CentralTime.calendar.dateComponents([.day], from: today, to: picked).day ?? 0
    }

    private var selectableRange: ClosedRange<Date> {
        if let range = store.contiguousDateRange {
            return range
        }
        let calendar = CentralTime.calendar
        let today = CentralTime.date(from: CentralTime.todayString()) ?? Date()
        let lower = calendar.date(byAdding: .day, value: -3, to: today) ?? today
        let upper = calendar.date(byAdding: .day, value: 3, to: today) ?? today
        return lower...upper
    }
}
