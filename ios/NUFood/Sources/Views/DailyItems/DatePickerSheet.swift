import SwiftUI

/// Graphical date picker (SPEC §2.1) limited to the loaded menu's date span
/// (`store.availableDates` min…max), falling back to today ±3 days when empty.
/// The picker runs on the Central calendar/timezone so the selected day round-trips
/// cleanly through `CentralTime.dateFormat` regardless of the device's timezone.
struct DatePickerSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack {
                DatePicker(
                    "Select Date",
                    selection: dateBinding,
                    in: selectableRange,
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .tint(Theme.primary)
                .environment(\.calendar, CentralTime.calendar)
                .environment(\.timeZone, CentralTime.timeZone)
                .padding()

                Spacer()
            }
            .background(Theme.background)
            .navigationTitle("Select Date")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private var dateBinding: Binding<Date> {
        Binding(
            get: { CentralTime.date(from: store.selectedDate) ?? Date() },
            set: { store.selectedDate = CentralTime.dateFormat.string(from: $0) }
        )
    }

    private var selectableRange: ClosedRange<Date> {
        let dates = store.availableDates.compactMap(CentralTime.date(from:))
        if let min = dates.first, let max = dates.last, min <= max {
            return min...max
        }
        let calendar = CentralTime.calendar
        let today = CentralTime.date(from: CentralTime.todayString()) ?? Date()
        let lower = calendar.date(byAdding: .day, value: -3, to: today) ?? today
        let upper = calendar.date(byAdding: .day, value: 3, to: today) ?? today
        return lower...upper
    }
}
