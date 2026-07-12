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
    var onRequestAuth: () -> Void

    @Environment(AppStore.self) private var store
    @Environment(AuthManager.self) private var auth
    @AppStorage("expandFolders") private var expandFolders = false

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
            get: { expandedOverrides[section.id] ?? section.defaultExpanded },
            set: { expandedOverrides[section.id] = $0 }
        )
    }

    private func handleTap(_ item: DailyItem) {
        if auth.isSignedIn {
            store.toggleFavorite(item.name)
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
    let onTap: (DailyItem) -> Void

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
                            style: section.style
                        ) {
                            onTap(item)
                        }
                        .contextMenu { ItemDetailMenu(item: item) }
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
    }
}

/// Lightweight secondary detail shown on long-press: description, portion, and macros (SPEC §3.7).
private struct ItemDetailMenu: View {
    let item: DailyItem

    var body: some View {
        Text(item.name)
        if !item.description.isEmpty {
            Text(item.description)
        }
        if !item.portionSize.isEmpty {
            Text("Portion: \(item.portionSize)")
        }
        Text("Calories: \(NutrientParsing.display(item.calories))")
        Text("Protein: \(NutrientParsing.display(item.protein, unit: "g"))")
        Text("Carbs: \(NutrientParsing.display(item.carbs, unit: "g"))")
        Text("Fat: \(NutrientParsing.display(item.fat, unit: "g"))")
    }
}
