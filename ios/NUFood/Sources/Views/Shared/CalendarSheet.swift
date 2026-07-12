import SwiftUI

/// The app's standard date-picker sheet (the Daily Items calendar): full sheet,
/// inline "Select Date" title, Done button, graphical picker pinned to Central time.
struct CalendarSheet: View {
    @Binding var selection: Date
    let range: ClosedRange<Date>

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack {
                DatePicker(
                    "Select Date",
                    selection: $selection,
                    in: range,
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
}
