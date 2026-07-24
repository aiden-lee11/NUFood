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
    @State private var now = DailyItemsScreen.initialNow

    /// Dev affordance: `simctl launch ... -nowOverride 2026-07-10T17:00:00Z` pins
    /// the reference clock (used for populated App Store screenshots).
    private static var initialNow: Date {
        if let s = UserDefaults.standard.string(forKey: "nowOverride"),
           let d = ISO8601DateFormatter().date(from: s) { return d }
        return Date()
    }
    @State private var query = ""
    @State private var showDisplaySettings = false
    @State private var showDatePicker = false
    @State private var showAuthPrompt = false
    /// The date for which the "Error Loading Data" popup has already been dismissed.
    @State private var errorDismissedDate: String?

    /// Memoized grouping of the selected day's items: location → meal → items,
    /// already run through the search filter. Rebuilt only when its inputs change
    /// (menu data or query) — crucially NOT on the minute clock tick, which mutates
    /// `now` and re-evaluates the body but only affects open/closed status text.
    /// Replaces the old per-(hall, meal) `filter` scans that re-ran ~50× per body
    /// pass over the full ~750-item day (SPEC §2.1).
    @State private var grouped = GroupedDayItems.empty

    private let clock = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            Group {
                if store.isLoading && hasNoData {
                    ProgressView()
                        .controlSize(.large)
                        .tint(Theme.primary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = store.loadError, hasNoData {
                    loadErrorView(error)
                } else {
                    ScrollView {
                        // Horizontal inset is applied per-element (not to the whole
                        // stack) so the pinned hall headers in `cards` can go full-bleed
                        // while their text stays aligned with the padded content.
                        VStack(alignment: .leading, spacing: 16) {
                            header.padding(.horizontal)
                            controlsRow.padding(.horizontal)
                            mealChips.padding(.horizontal)
                            searchField.padding(.horizontal)
                            cards
                        }
                        .padding(.vertical)
                    }
                    .refreshable { await store.refresh() }
                }
            }
            .background(Theme.background)
            .navigationTitle("Daily Items")
            .navigationBarTitleDisplayMode(.inline)
            // Content scrolling under the bar should blend into the app's dark purple,
            // not the system's default gray material, in both themes.
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    ThemeToggleButton()
                    AccountToolbarButton()
                }
            }
            .onReceive(clock) {
                if UserDefaults.standard.string(forKey: "nowOverride") == nil { now = $0 }
                // Keeps the shown day/meal on the same clock as the status text, so
                // crossing into dinner with the app open swaps the section over.
                store.syncToClock(now: now)
            }
            // Rebuild the grouping only when its true inputs move. `dayItems` covers
            // both the loaded menu changing and the selected date switching; `query`
            // covers the search filter. The clock tick touches neither.
            .onAppear { rebuildGrouping() }
            .onChange(of: dayItems) { rebuildGrouping() }
            .onChange(of: query) { rebuildGrouping() }
            .sheet(isPresented: $showDisplaySettings) { DisplaySettingsSheet() }
            .sheet(isPresented: $showDatePicker) { DatePickerSheet() }
            .sheet(isPresented: $showAuthPrompt) { AuthPromptSheet() }
            .alert("Error Loading Data", isPresented: errorBinding) {
                Button("Retry") {
                    // Re-arm the alert once the reload finishes so a still-broken
                    // menu surfaces again instead of staying dismissed for the day.
                    Task {
                        await store.load()
                        errorDismissedDate = nil
                    }
                }
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
        Text("Daily Items for \(headerDateString)")
            .font(.title.bold())
            .foregroundStyle(Theme.textPrimary)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
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

    /// Quick meal switching without opening the sheet: one chip per meal period,
    /// toggling that meal's membership in `visibleTimes` with the same multi-select
    /// semantics as the sheet's "Times" checkboxes (the two stay in sync both ways).
    /// Hall filtering deliberately stays in the sheet to keep this row uncluttered.
    private var mealChips: some View {
        HStack(spacing: 8) {
            ForEach(mealPeriodOrder, id: \.self) { meal in
                let selected = store.visibleTimes.contains(meal)
                Button { toggleMeal(meal) } label: {
                    Text(meal)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(selected ? Theme.primaryForeground : Theme.textPrimary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(selected ? Theme.primary : Theme.card, in: Capsule())
                        .overlay(
                            Capsule().stroke(selected ? Color.clear : Theme.border, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(meal)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
            Spacer(minLength: 0)
        }
    }

    /// Toggle a meal in `visibleTimes`, preserving canonical Breakfast/Lunch/Dinner
    /// order on insert. Mirrors `DisplaySettingsSheet.toggleMeal` so the chips and the
    /// sheet checkboxes drive the same state.
    private func toggleMeal(_ meal: String) {
        if store.visibleTimes.contains(meal) {
            store.visibleTimes.removeAll { $0 == meal }
        } else {
            store.visibleTimes = mealPeriodOrder.filter { store.visibleTimes.contains($0) || $0 == meal }
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
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        // Inputs use the muted `secondary` capsule so they read as fields, not as
        // another card row (rows own the bordered rounded-rect look).
        .background(Theme.secondary, in: Capsule())
    }

    @ViewBuilder
    private var cards: some View {
        if store.visibleTimes.isEmpty {
            noMealsState
                .padding(.horizontal)
        } else {
            // Pinned section headers keep the hall name + status visible while its
            // (often long) item list scrolls underneath. The LazyVStack itself is
            // full-bleed so headers reach both screen edges; card CONTENT carries the
            // horizontal inset instead.
            LazyVStack(spacing: 16, pinnedViews: [.sectionHeaders]) {
                ForEach(sortedVisibleLocations) { location in
                    Section {
                        LocationCard(
                            location: location,
                            meals: mealSections(for: location),
                            hasItems: hasAnyItems(for: location),
                            isSearching: isSearching,
                            onRequestAuth: { showAuthPrompt = true }
                        )
                        .padding(.horizontal)
                    } header: {
                        locationHeader(for: location)
                    }
                }
            }
        }
    }

    /// The compact pinned bar for a location section: hall name plus, on today, a
    /// live open/closed status. Its opaque surface (+ hairline) stops the item list
    /// from bleeding through as it scrolls under the pinned header.
    ///
    /// The background + hairline are full-bleed (edge to edge, no rounding) so the
    /// header reads as a seamless bar rather than a floating card: the horizontal
    /// inset lives on the inner HStack, keeping the text aligned with card content
    /// while the fill spans the whole screen width.
    private func locationHeader(for location: DiningLocation) -> some View {
        let status = isToday ? status(for: location) : nil
        return HStack(alignment: .firstTextBaseline) {
            Text(location.rawValue)
                .font(.title3.bold())
                .foregroundStyle(Theme.textPrimary)
            Spacer(minLength: 8)
            if let status {
                MealStatusBadge(isOpen: status.isOpen, detail: statusDetail(for: status))
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(alignment: .bottom) {
            Theme.background
                .overlay(alignment: .bottom) {
                    Rectangle().fill(Theme.border).frame(height: 1)
                }
        }
    }

    /// Outside meal windows `visibleTimes` empties on its own (SPEC §3.6), which
    /// used to render a wall of blank cards; explain instead. All meals unchecked
    /// by hand during a meal window points at Display Settings.
    private var noMealsState: some View {
        let isNight = CentralTime.currentMealPeriod(now: now) == nil
        return VStack(spacing: 12) {
            Image(systemName: isNight ? "moon.zzz" : "line.3.horizontal.decrease.circle")
                .font(.system(size: 44))
                .foregroundStyle(Theme.textSecondary)
            Text(isNight ? "All closed for the night" : "No meal periods selected")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)
            Text(isNight
                ? "Check back tomorrow — or tap a meal chip above to browse ahead."
                : "Tap a meal chip above to choose one.")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Derived data

    private var dayItems: [DailyItem] {
        store.weeklyItems[store.selectedDate] ?? []
    }

    /// True before any menu data has arrived; gates the full-screen loading and
    /// error states so a pull-to-refresh never blanks an already-rendered menu.
    private var hasNoData: Bool { store.weeklyItems.isEmpty }

    /// Live open/closed status only applies to today (matches the Hours screen);
    /// a hand-picked past or future date shows no wall-clock status.
    private var isToday: Bool { store.selectedDate == store.syncedDay }

    private func loadErrorView(_ error: String) -> some View {
        VStack(spacing: 16) {
            Text("Error loading data: \(error)")
                .font(.subheadline)
                .foregroundStyle(Theme.destructive)
                .multilineTextAlignment(.center)
            Button {
                Task { await store.load() }
            } label: {
                Label("Retry", systemImage: "arrow.clockwise")
            }
            .modifier(OutlineButton())
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var searchTokens: [String] {
        query.lowercased()
            .split(whereSeparator: { $0 == " " || $0 == "\n" })
            .map(String.init)
    }

    /// True while the user has an active search; drives the accordion to force every
    /// station open so a match can't hide behind a collapsed folder.
    private var isSearching: Bool { !searchTokens.isEmpty }

    /// Rebuilds `grouped` in a single pass over the day's items: for each item that
    /// passes the search filter, bucket it under location → meal. Replaces the old
    /// ~50 repeated full-array `filter` scans per body pass.
    private func rebuildGrouping() {
        let tokens = searchTokens
        var byLocation: [String: [String: [DailyItem]]] = [:]
        for item in dayItems {
            if !tokens.isEmpty {
                let name = item.name.lowercased()
                guard tokens.allSatisfy({ name.contains($0) }) else { continue }
            }
            byLocation[item.location, default: [:]][item.timeOfDay, default: []].append(item)
        }
        grouped = GroupedDayItems(byLocation: byLocation)
    }

    /// The (meal, items) pairs to render on a card: visible meals with ≥1 item, in canonical order.
    private func mealSections(for location: DiningLocation) -> [MealSection] {
        mealPeriodOrder
            .filter { store.visibleTimes.contains($0) }
            .compactMap { meal in
                let items = grouped.items(for: location, meal: meal)
                return items.isEmpty ? nil : MealSection(meal: meal, items: items)
            }
    }

    /// Any items today at ANY meal (post-search). The web's has-items check ignores
    /// `visibleTimes`, so dimming/sorting must too — only section rendering filters.
    private func hasAnyItems(for location: DiningLocation) -> Bool {
        grouped.hasAnyItems(for: location)
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

    /// The badge's second, uppercase segment. Open → the current meal ("DINNER");
    /// closed → a compact reopen hint ("OPENS 5:00 PM" / "OPENS IN 20 MIN") derived
    /// from the already-computed status text. nil when there's nothing useful to add.
    private func statusDetail(for status: OperatingHoursLogic.LocationStatus) -> String? {
        if status.isOpen {
            return CentralTime.currentMealPeriod(now: now)?.uppercased()
        }
        let text = status.text
        if let range = text.range(of: "until ") {
            return "OPENS " + text[range.upperBound...].uppercased()
        }
        if text.lowercased().hasPrefix("opens in") {
            return text.uppercased()
                .replacingOccurrences(of: "MINUTES", with: "MIN")
                .replacingOccurrences(of: "MINUTE", with: "MIN")
        }
        return nil
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

/// A search-filtered grouping of one day's items, keyed location → meal → items.
/// Built once per input change (see `DailyItemsScreen.rebuildGrouping`) so the
/// screen's per-hall/per-meal lookups are O(1) dictionary reads instead of full
/// array scans.
struct GroupedDayItems {
    /// location rawValue → meal period → items.
    let byLocation: [String: [String: [DailyItem]]]

    static let empty = GroupedDayItems(byLocation: [:])

    func items(for location: DiningLocation, meal: String) -> [DailyItem] {
        byLocation[location.rawValue]?[meal] ?? []
    }

    func hasAnyItems(for location: DiningLocation) -> Bool {
        byLocation[location.rawValue]?.values.contains { !$0.isEmpty } ?? false
    }
}

/// The pinned hall header's live status, in the compact "OPEN · DINNER" /
/// "CLOSED · OPENS 5:00 PM" treatment: a small color dot plus uppercase, tracked,
/// bold text — green when open, red when closed. Mirrors the Hours screen's
/// `OpenStatusBadge` color logic in a denser, header-friendly form.
private struct MealStatusBadge: View {
    let isOpen: Bool
    /// Optional uppercase second segment (meal period, or reopen hint).
    let detail: String?

    private var color: Color { isOpen ? Theme.openGreen : Theme.closedRed }

    private var text: String {
        let lead = isOpen ? "OPEN" : "CLOSED"
        if let detail, !detail.isEmpty { return "\(lead) · \(detail)" }
        return lead
    }

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text(text)
                .font(.caption2.weight(.bold))
                .tracking(0.6)
                .foregroundStyle(color)
                .lineLimit(1)
        }
        .fixedSize()
        .accessibilityElement(children: .combine)
        .accessibilityLabel(text.capitalized)
    }
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
