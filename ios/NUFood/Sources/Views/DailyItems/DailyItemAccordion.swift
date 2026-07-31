import SwiftUI

/// A grouped, collapsible station section within one location + meal.
private struct StationSection: Identifiable {
    let id: String
    let title: String
    let items: [DailyItem]
    let style: ItemRowStyle
    let defaultExpanded: Bool
}

/// The core menu-list widget for one location + meal (SPEC §2.1.3).
/// Groups items by StationName into collapsible sections:
///   1. "My Favorites" (signed in + has available favorites; always expanded; favorite style rows)
///   2. Whitelisted stations (expanded by default, in spec order)
///   3. Remaining stations (collapsed, or expanded when "Expand All Folders by Default" is on)
struct DailyItemAccordion: View {
    /// Items for exactly one location + meal, already search-filtered.
    let items: [DailyItem]
    /// While searching, every station renders expanded so a match can't hide behind
    /// a collapsed folder; prior per-section expansion returns once search is cleared.
    var isSearching: Bool = false
    /// Item id → dietary-profile allergen conflict, populated only in "warn" mode.
    var warnings: [String: DietaryProfile.AllergenHit] = [:]
    var onRequestAuth: () -> Void

    @Environment(AppStore.self) private var store
    @Environment(AuthManager.self) private var auth
    @AppStorage("expandFolders") private var expandFolders = false
    /// Option C: when on, each row shows a one-line macro caption under its name plus
    /// its green diet mini-tag. Local-only preference (mirrors `expandFolders`); see
    /// `DisplaySettingsSheet`.
    @AppStorage("showNutrition") private var showNutrition = false

    /// User overrides of per-section expansion, keyed by section id. Absent → use default.
    @State private var expandedOverrides: [String: Bool] = [:]

    private static let favoritesTitle = "My Favorites"

    /// Stations that open by default (SPEC §2.1.3 / §6), excluding the special "My Favorites".
    private static let defaultExpandedStations: [String] = [
        "Comfort", "Comfort 1", "Comfort 2",
        "Rooted", "Rooted 1", "Rooted 2",
        "Pure Eats", "Pure Eats 1", "Pure Eats 2",
        "Kitchen Entree", "Kitchen Sides"
    ]

    var body: some View {
        VStack(spacing: 8) {
            ForEach(sections) { section in
                AccordionSection(
                    section: section,
                    isExpanded: binding(for: section),
                    isFavorite: { store.favorites.contains($0.name) },
                    showNutrition: showNutrition,
                    warnings: warnings,
                    onTap: handleTap
                )
            }
        }
    }

    // MARK: - Section building

    private var sections: [StationSection] {
        var result: [StationSection] = []

        // 1. My Favorites — deduped by Name, only when signed in and present on this list.
        let favorites = favoriteItems
        if !favorites.isEmpty {
            result.append(StationSection(
                id: Self.favoritesTitle,
                title: Self.favoritesTitle,
                items: favorites,
                style: .favorite,
                defaultExpanded: true
            ))
        }

        // Group remaining stations, preserving first-appearance order.
        var order: [String] = []
        var groups: [String: [DailyItem]] = [:]
        for item in items {
            if groups[item.stationName] == nil { order.append(item.stationName) }
            groups[item.stationName, default: []].append(item)
        }

        // 2. Whitelisted stations, in spec order.
        for name in Self.defaultExpandedStations {
            if let group = groups[name] {
                result.append(StationSection(id: name, title: name, items: group, style: .standard, defaultExpanded: true))
            }
        }

        // 3. Remaining stations, first-appearance order; collapsed unless expand-all is on.
        let whitelist = Set(Self.defaultExpandedStations)
        for name in order where !whitelist.contains(name) {
            if let group = groups[name] {
                result.append(StationSection(id: name, title: name, items: group, style: .standard, defaultExpanded: expandFolders))
            }
        }

        return result
    }

    private var favoriteItems: [DailyItem] {
        guard auth.isSignedIn else { return [] }
        var seen = Set<String>()
        var result: [DailyItem] = []
        for item in items where store.favorites.contains(item.name) {
            if seen.insert(item.name).inserted { result.append(item) }
        }
        return result
    }

    // MARK: - Interaction

    private func binding(for section: StationSection) -> Binding<Bool> {
        Binding(
            // An active search overrides everything (including a user's manual
            // collapse) so matches are always visible; clearing it restores the
            // stored override / default.
            get: { isSearching || (expandedOverrides[section.id] ?? section.defaultExpanded) },
            set: { expanded in
                expandedOverrides[section.id] = expanded
                // Only the header button writes this binding, so an event here is a
                // deliberate open — collapsing, and the search-driven auto-expand
                // (which goes through `get`), are both silent.
                if expanded {
                    AppAnalytics.locationExpanded(
                        location: section.items.first?.location ?? "Unknown",
                        station: section.title
                    )
                }
            }
        )
    }

    private func handleTap(_ item: DailyItem) {
        if auth.isSignedIn {
            store.toggleFavorite(item.name, location: item.location)
        } else {
            onRequestAuth()
        }
    }
}

/// One collapsible station section: a tappable header with chevron over a list of item rows.
private struct AccordionSection: View {
    let section: StationSection
    @Binding var isExpanded: Bool
    let isFavorite: (DailyItem) -> Bool
    /// Option C: whether to render the inline macro caption and green diet mini-tag
    /// on each row. Allergen warnings ignore this — they're safety info.
    let showNutrition: Bool
    /// Item id → dietary-profile allergen conflict, populated only in "warn" mode.
    let warnings: [String: DietaryProfile.AllergenHit]
    let onTap: (DailyItem) -> Void

    /// The item whose nutrition detail sheet (Option A) is presented, if any.
    @State private var detailItem: DailyItem?

    var body: some View {
        VStack(spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
            } label: {
                HStack {
                    Text(section.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.textPrimary)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Theme.textSecondary)
                }
                .padding(12)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(spacing: 8) {
                    ForEach(section.items) { item in
                        ItemRowButton(
                            name: item.name,
                            isFavorite: isFavorite(item),
                            style: section.style,
                            subtitle: showNutrition ? NutritionFormat.inlineCaption(for: item) : nil,
                            // Rides the same toggle as the macro caption: both are
                            // "extra detail per row". The amber allergen warning below
                            // is safety info and stays on regardless.
                            dietTag: showNutrition ? item.primaryDietLabel : nil,
                            warning: warnings[item.id]?.label,
                            onInfo: { detailItem = item }
                        ) {
                            onTap(item)
                        }
                        // Long-press shortcut kept working (SPEC §3.7): a styled preview
                        // card (mini NutritionDetailSheet) over favorite / info actions.
                        // The ⓘ sheet remains the primary detail surface.
                        .contextMenu {
                            Button {
                                onTap(item)
                            } label: {
                                Label(
                                    isFavorite(item) ? "Remove from Favorites" : "Add to Favorites",
                                    systemImage: isFavorite(item) ? "star.slash" : "star"
                                )
                            }
                            Button {
                                detailItem = item
                            } label: {
                                Label("Nutrition info", systemImage: "info.circle")
                            }
                        } preview: {
                            ItemPreviewCard(item: item)
                        }
                    }
                }
                .padding([.horizontal, .bottom], 12)
            }
        }
        .background(Theme.background, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius)
                .stroke(Theme.border, lineWidth: 1)
        )
        .sheet(item: $detailItem) { item in
            NutritionDetailSheet(item: item, onToggleFavorite: { onTap(item) })
        }
    }
}

/// The long-press context-menu preview: a compact mirror of `NutritionDetailSheet`
/// (SPEC §3.7) so the peek reads as a mini info sheet rather than the default plain
/// text box — bold name, "Hall · Station · Meal" context line, and the four-cell macro
/// grid on a `Theme.card` surface.
private struct ItemPreviewCard: View {
    let item: DailyItem

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.headline)
                    .foregroundStyle(Theme.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                Text("\(item.location) · \(item.stationName) · \(item.timeOfDay)")
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Truncated here (the sheet shows it in full) so the peek stays compact;
            // absent for most items, which send "".
            if !item.description.isEmpty {
                Text(item.description)
                    .font(.caption)
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 8) {
                macroCell("Cal", value: NutritionFormat.cell(item.caloriesValue))
                macroCell("Protein", value: NutritionFormat.cell(item.proteinValue, unit: "g"))
                macroCell("Carbs", value: NutritionFormat.cell(item.carbsValue, unit: "g"))
                macroCell("Fat", value: NutritionFormat.cell(item.fatValue, unit: "g"))
            }
        }
        .padding(16)
        .frame(width: 320, alignment: .leading)
        .background(Theme.card)
    }

    /// One macro tile: bold value over a muted label, on a bordered inner cell —
    /// the compact form of `NutritionDetailSheet.macroCell`.
    private func macroCell(_ label: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.textPrimary)
            Text(label)
                .font(.caption2)
                .foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Theme.background, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius)
                .stroke(Theme.border, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label) \(value)")
    }
}

/// Option A primary detail surface: a compact bottom sheet reached by the row's ⓘ.
/// Shows the item name, a "Hall · Station · Meal" context line, its diet/marketing
/// tags, a four-cell macro grid, allergen chip rows, ingredients, an optional portion,
/// and a full-width favorite toggle (SPEC §3.7).
///
/// Everything tag-derived is data-dependent and simply absent when the menu carries
/// no `filters`/`ingredients` — which is still the case on deployed backends.
private struct NutritionDetailSheet: View {
    let item: DailyItem
    /// Toggles the favorite through the same path the row uses (auth-aware).
    let onToggleFavorite: () -> Void

    @Environment(AppStore.self) private var store

    // Read (and, for diets, written) here so tapping a diet tag configures the
    // profile in place — see `DietaryProfile`.
    @AppStorage(DietaryProfile.Key.diets) private var dietsRaw = ""
    @AppStorage(DietaryProfile.Key.allergens) private var allergensRaw = ""
    @AppStorage(DietaryProfile.Key.mayContainUnsafe) private var mayContainUnsafe = true
    @AppStorage(DietaryProfile.Key.conflictMode) private var conflictModeRaw = DietaryProfile.ConflictMode.hide.rawValue

    /// The diet whose "Show only … items?" confirmation is up, if any.
    @State private var pendingDiet: String?

    private var isFavorite: Bool { store.favorites.contains(item.name) }

    private var profile: DietaryProfile {
        DietaryProfile(
            dietsRaw: dietsRaw,
            allergensRaw: allergensRaw,
            mayContainUnsafe: mayContainUnsafe,
            conflictModeRaw: conflictModeRaw
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.name)
                            .font(.title3.bold())
                            .foregroundStyle(Theme.textPrimary)
                            .fixedSize(horizontal: false, vertical: true)
                        Text("\(item.location) · \(item.stationName) · \(item.timeOfDay)")
                            .font(.subheadline)
                            .foregroundStyle(Theme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    // Only ~a quarter of items carry a description, and the backend sends ""
                    // for the rest — never render an empty block.
                    if !item.description.isEmpty {
                        Text(item.description)
                            .font(.subheadline)
                            .foregroundStyle(Theme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    tagRow

                    HStack(spacing: 8) {
                        macroCell("Cal", value: NutritionFormat.cell(item.caloriesValue))
                        macroCell("Protein", value: NutritionFormat.cell(item.proteinValue, unit: "g"))
                        macroCell("Carbs", value: NutritionFormat.cell(item.carbsValue, unit: "g"))
                        macroCell("Fat", value: NutritionFormat.cell(item.fatValue, unit: "g"))
                    }

                    allergenSection("Contains", allergens: item.containsAllergens, tint: Theme.destructive)
                    allergenSection("May contain", allergens: item.mayContainAllergens, tint: Theme.warningYellow)
                    ingredientsSection

                    if !item.portionSize.isEmpty {
                        Text("Portion: \(item.portionSize)")
                            .font(.subheadline)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
            }

            Button(action: onToggleFavorite) {
                Text(isFavorite ? "Remove from Favorites" : "Add to Favorites")
                    .font(.headline)
                    .foregroundStyle(Theme.primaryForeground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.primary, in: RoundedRectangle(cornerRadius: Theme.radius))
            }
            .buttonStyle(.plain)
            .padding([.horizontal, .bottom], 20)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.background)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .confirmationDialog(
            pendingDiet.map { "Show only \(DietaryTag.label(for: $0)) items?" } ?? "",
            isPresented: pendingDietBinding,
            titleVisibility: .visible
        ) {
            if let diet = pendingDiet {
                Button("Show only \(DietaryTag.label(for: diet)) items") { addDiet(diet) }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Adds it to your diet filter in Display Settings. It stays on until you turn it off.")
        }
    }

    // MARK: - Tags

    /// Diet + marketing tags. Diet chips are tappable: they're the one tag a user can
    /// act on, and "I want more of this" is the obvious next thought after reading one.
    @ViewBuilder
    private var tagRow: some View {
        let diets = item.dietTags
        let marketing = item.marketingTags
        if !diets.isEmpty || !marketing.isEmpty {
            FlowLayout(spacing: 8, lineSpacing: 8) {
                ForEach(diets, id: \.self) { diet in
                    Button { pendingDiet = diet } label: {
                        TagChip(
                            text: DietaryTag.label(for: diet),
                            tint: Theme.openGreen,
                            style: .soft,
                            font: .footnote.weight(.semibold)
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Show only \(DietaryTag.label(for: diet)) items")
                }
                ForEach(marketing, id: \.self) { tag in
                    TagChip(text: tag, tint: Theme.openGreen, style: .soft, font: .footnote.weight(.semibold))
                }
            }
        }
    }

    /// "CONTAINS" / "MAY CONTAIN" chip rows. Allergens already in the user's profile
    /// are called out inline so the reason an item was flagged is never a guess.
    @ViewBuilder
    private func allergenSection(_ title: String, allergens: [String], tint: Color) -> some View {
        if !allergens.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                sectionLabel(title)
                FlowLayout(spacing: 8, lineSpacing: 8) {
                    ForEach(allergens, id: \.self) { allergen in
                        TagChip(
                            text: profile.avoids(allergen) ? "\(allergen) — in your profile" : allergen,
                            tint: tint,
                            style: .soft,
                            font: .footnote.weight(profile.avoids(allergen) ? .bold : .medium)
                        )
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var ingredientsSection: some View {
        let ingredients = item.displayIngredients
        if !ingredients.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                sectionLabel("Ingredients")
                Text(ingredients)
                    .font(.footnote)
                    .foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(0.6)
            .foregroundStyle(Theme.textSecondary)
    }

    private var pendingDietBinding: Binding<Bool> {
        Binding(
            get: { pendingDiet != nil },
            set: { if !$0 { pendingDiet = nil } }
        )
    }

    private func addDiet(_ diet: String) {
        var diets = profile.selectedDiets
        diets.insert(diet)
        dietsRaw = DietaryProfile.encode(diets)
        AppAnalytics.dietaryFilterChanged(.diet, action: "added")
        pendingDiet = nil
    }

    /// One macro tile: bold value over a muted label, on a bordered card cell.
    private func macroCell(_ label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)
            Text(label)
                .font(.caption)
                .foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius)
                .stroke(Theme.border, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label) \(value)")
    }
}

/// Formatting for the nutrition surfaces: the inline row caption (Option C) and the
/// detail sheet's macro cells (Option A). Reuses `NutrientParsing` for junk handling.
enum NutritionFormat {
    /// "320 cal · 42g protein · 2g carbs · 14g fat"; segments with missing data are
    /// omitted, and nil is returned when nothing at all is available.
    static func inlineCaption(for item: DailyItem) -> String? {
        var parts: [String] = []
        if let v = item.caloriesValue { parts.append("\(trim(v)) cal") }
        if let v = item.proteinValue { parts.append("\(trim(v))g protein") }
        if let v = item.carbsValue { parts.append("\(trim(v))g carbs") }
        if let v = item.fatValue { parts.append("\(trim(v))g fat") }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    /// A macro-grid cell value, or "—" when the datum is missing/junk.
    static func cell(_ value: Double?, unit: String = "") -> String {
        guard let value else { return "—" }
        return trim(value) + unit
    }

    /// Whole numbers print without a decimal ("320"); fractional values keep one ("2.5").
    static func trim(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(format: "%.1f", value)
    }
}
