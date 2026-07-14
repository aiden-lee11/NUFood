import Combine
import SwiftUI

/// Home screen — today's (or a chosen day's) menu grouped by dining hall → meal → station.
/// SPEC §2.1. Search here is a simple case-insensitive token/substring match on `Name`
/// in place of the web's Fuse.js fuzzy search (documented divergence).
struct DailyItemsScreen: View {
    @Environment(AppStore.self) private var store
    @Environment(AuthManager.self) private var auth
    @Environment(\.openURL) private var openURL

    /// Wall-clock used for live status text / open count; refreshed every 60s.
    @State private var now = Date()
    @State private var query = ""
    @State private var showDisplaySettings = false
    @State private var showDatePicker = false
    @State private var showAuthPrompt = false
    /// The date for which the "Error Loading Data" popup has already been dismissed.
    @State private var errorDismissedDate: String?

    private let clock = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    controlsRow
                    searchField
                    cards
                }
                .padding()
            }
            .background(Theme.background)
            .navigationTitle("Daily Items")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    ThemeToggleButton()
                    AccountToolbarButton()
                }
            }
            .onReceive(clock) { now = $0 }
            .sheet(isPresented: $showDisplaySettings) { DisplaySettingsSheet() }
            .sheet(isPresented: $showDatePicker) { DatePickerSheet() }
            .sheet(isPresented: $showAuthPrompt) { AuthPromptSheet() }
            .alert("Error Loading Data", isPresented: errorBinding) {
                // Web parity: the error dialog offers a feedback path right there.
                Button("Send Feedback") {
                    if let url = URL(string: "mailto:nufoodfinder@gmail.com?subject=NUFood%20Feedback") {
                        openURL(url)
                    }
                }
                Button("Dismiss", role: .cancel) {}
            } message: {
                Text("We're having trouble loading the menu items. This could be due to a temporary issue with our data source. Please try again later or contact support if the problem persists.")
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Daily Items for \(headerDateString)")
                .font(.title.bold())
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(openCountText)
                .font(.title3)
                .foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var controlsRow: some View {
        HStack(spacing: 12) {
            Button { showDisplaySettings = true } label: {
                Label("Display Settings", systemImage: "gearshape")
            }
            .modifier(OutlineButton())

            Button { showDatePicker = true } label: {
                Label(buttonDateString, systemImage: "calendar")
            }
            .modifier(OutlineButton())

            Spacer(minLength: 0)
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Theme.textSecondary)
            TextField("Search for an item...", text: $query)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .foregroundStyle(Theme.textPrimary)
        }
        .padding(12)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius)
                .stroke(Theme.border, lineWidth: 1)
        )
    }

    private var cards: some View {
        LazyVStack(spacing: 16) {
            ForEach(sortedVisibleLocations) { location in
                LocationCard(
                    location: location,
                    meals: mealSections(for: location),
                    hasItems: hasAnyItems(for: location),
                    status: status(for: location),
                    onRequestAuth: { showAuthPrompt = true }
                )
            }
        }
    }

    // MARK: - Derived data

    private var dayItems: [DailyItem] {
        store.weeklyItems[store.selectedDate] ?? []
    }

    private var searchTokens: [String] {
        query.lowercased()
            .split(whereSeparator: { $0 == " " || $0 == "\n" })
            .map(String.init)
    }

    private func matchesSearch(_ item: DailyItem) -> Bool {
        let tokens = searchTokens
        guard !tokens.isEmpty else { return true }
        let name = item.name.lowercased()
        return tokens.allSatisfy { name.contains($0) }
    }

    /// Items for one hall + meal on the selected date, after the search filter.
    private func items(for location: DiningLocation, meal: String) -> [DailyItem] {
        dayItems.filter {
            $0.location == location.rawValue &&
            $0.timeOfDay == meal &&
            matchesSearch($0)
        }
    }

    /// The (meal, items) pairs to render on a card: visible meals with ≥1 item, in canonical order.
    private func mealSections(for location: DiningLocation) -> [MealSection] {
        mealPeriodOrder
            .filter { store.visibleTimes.contains($0) }
            .compactMap { meal in
                let items = items(for: location, meal: meal)
                return items.isEmpty ? nil : MealSection(meal: meal, items: items)
            }
    }

    /// Any items today at ANY meal (post-search). The web's has-items check ignores
    /// `visibleTimes`, so dimming/sorting must too — only section rendering filters.
    private func hasAnyItems(for location: DiningLocation) -> Bool {
        mealPeriodOrder.contains { !items(for: location, meal: $0).isEmpty }
    }

    /// Visible locations in canonical order, stably sorted so those with items come first.
    private var sortedVisibleLocations: [DiningLocation] {
        let visible = Set(store.displayPreferences.visibleLocations)
        let locations = DiningLocation.allCases.filter { visible.contains($0.rawValue) }
        let withItems = locations.filter { hasAnyItems(for: $0) }
        let withoutItems = locations.filter { !hasAnyItems(for: $0) }
        return withItems + withoutItems
    }

    private func status(for location: DiningLocation) -> OperatingHoursLogic.LocationStatus {
        let intervals = OperatingHoursLogic.intervals(
            in: store.locationOperatingTimes,
            location: location,
            dateString: store.selectedDate
        )
        return OperatingHoursLogic.status(intervals: intervals, now: now)
    }

    private var openCountText: String {
        let count = OperatingHoursLogic.openLocations(
            in: store.locationOperatingTimes,
            dateString: store.selectedDate,
            now: now
        ).count
        guard count >= 1 else { return "(All locations closed)" }
        return count == 1 ? "(1 location open)" : "(\(count) locations open)"
    }

    private var headerDateString: String {
        let date = CentralTime.date(from: store.selectedDate) ?? Date()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = CentralTime.timeZone
        let day = calendar.component(.day, from: date)
        let month = Self.headerMonthFormatter.string(from: date)
        return "\(month) \(day)\(Self.ordinalSuffix(for: day))"
    }

    /// "st"/"nd"/"rd"/"th" for a day-of-month, with the 11th–13th "th" exception.
    private static func ordinalSuffix(for day: Int) -> String {
        switch day {
        case 11, 12, 13: return "th"
        default:
            switch day % 10 {
            case 1: return "st"
            case 2: return "nd"
            case 3: return "rd"
            default: return "th"
            }
        }
    }

    private var buttonDateString: String {
        let date = CentralTime.date(from: store.selectedDate) ?? Date()
        return Self.buttonDateFormatter.string(from: date)
    }

    // MARK: - Error popup

    /// True when the selected day has zero menu items yet operating-hours data says a hall
    /// should be open — i.e. the menu likely failed to scrape (SPEC §2.1.6).
    private var shouldShowError: Bool {
        guard errorDismissedDate != store.selectedDate else { return false }
        guard (store.weeklyItems[store.selectedDate] ?? []).isEmpty else { return false }
        return DiningLocation.allCases.contains { location in
            OperatingHoursLogic.intervals(
                in: store.locationOperatingTimes,
                location: location,
                dateString: store.selectedDate
            ) != nil
        }
    }

    private var errorBinding: Binding<Bool> {
        Binding(
            get: { shouldShowError },
            set: { presented in
                if !presented { errorDismissedDate = store.selectedDate }
            }
        )
    }

    /// Full month for the page title; combined with an ordinal day and no year
    /// ("July 13th") so "Daily Items for <date>" stays short and on one line.
    private static let headerMonthFormatter: DateFormatter = {
        let df = DateFormatter()
        df.dateFormat = "MMMM"
        df.timeZone = CentralTime.timeZone
        df.locale = Locale(identifier: "en_US_POSIX")
        return df
    }()

    /// Compact form for the pill button so the controls row fits on one line.
    private static let buttonDateFormatter: DateFormatter = {
        let df = DateFormatter()
        df.dateFormat = "MMM d, yyyy"
        df.timeZone = CentralTime.timeZone
        df.locale = Locale(identifier: "en_US_POSIX")
        return df
    }()
}

/// One meal's worth of items on a location card.
struct MealSection: Identifiable {
    let meal: String
    let items: [DailyItem]
    var id: String { meal }
}

/// Outlined pill button used for the Display Settings / date controls.
private struct OutlineButton: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.subheadline.weight(.medium))
            .foregroundStyle(Theme.textPrimary)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius)
                    .stroke(Theme.border, lineWidth: 1)
            )
    }
}
