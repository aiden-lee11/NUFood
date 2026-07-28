import SwiftUI

/// Display Settings dialog (SPEC §2.1.5): a single scroll controlling which halls appear
/// and the two visual toggles (folder expansion, inline nutrition) for the Daily Items
/// screen. Also the first-run onboarding sheet.
///
/// Meal (time) visibility deliberately lives *only* on the main screen's meal chips now —
/// the old "Times" tab here was redundant with them. `store.visibleTimes` is still the
/// backing state; the chips read and write it directly.
struct DisplaySettingsSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("expandFolders") private var expandFolders = false
    /// Option C: show a macro caption under each Daily Items row. Local-only, like
    /// `expandFolders` (display prefs sync only `visibleLocations` to the backend).
    @AppStorage("showNutrition") private var showNutrition = false

    // The dietary profile — device-local too; see `DietaryProfile`.
    @AppStorage(DietaryProfile.Key.diets) private var dietsRaw = ""
    @AppStorage(DietaryProfile.Key.allergens) private var allergensRaw = ""
    @AppStorage(DietaryProfile.Key.mayContainUnsafe) private var mayContainUnsafe = true
    @AppStorage(DietaryProfile.Key.conflictMode) private var conflictModeRaw = DietaryProfile.ConflictMode.hide.rawValue

    /// The fixed allergen list unioned with tags found in the loaded menu, computed
    /// once on appear rather than re-scanning thousands of items on every chip tap.
    @State private var allergenOptions: [String] = DietaryTag.commonAllergens

    private var profile: DietaryProfile {
        DietaryProfile(
            dietsRaw: dietsRaw,
            allergensRaw: allergensRaw,
            mayContainUnsafe: mayContainUnsafe,
            conflictModeRaw: conflictModeRaw
        )
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    locationsSection
                    dietSection
                    allergenSection
                    visualSection
                }
                .padding()
            }
            .onAppear { allergenOptions = DietaryTag.ordered(menuAllergens()) }
            .background(Theme.background)
            .navigationTitle("Display Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                    }
                    .tint(Theme.textSecondary)
                }
            }
        }
    }

    // MARK: - Locations

    private var locationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("Dining Halls")

            quickButton("North Campus", icon: "mappin.and.ellipse") {
                store.setVisibleLocations(["Sargent", "Elder"])
            }
            quickButton("South Campus", icon: "mappin.and.ellipse") {
                store.setVisibleLocations(["Allison", "Plex East", "Plex West"])
            }
            quickButton("Clear Locations", icon: nil) {
                store.setVisibleLocations([])
            }

            VStack(spacing: 4) {
                ForEach(DiningLocation.allCases) { location in
                    CheckboxRow(
                        title: location.rawValue,
                        isOn: store.displayPreferences.visibleLocations.contains(location.rawValue)
                    ) {
                        toggleLocation(location)
                    }
                }
            }
            .padding(.top, 4)
        }
    }

    private func toggleLocation(_ location: DiningLocation) {
        var visible = Set(store.displayPreferences.visibleLocations)
        if visible.contains(location.rawValue) {
            visible.remove(location.rawValue)
        } else {
            visible.insert(location.rawValue)
        }
        // Persist in canonical order.
        let ordered = DiningLocation.allNames.filter { visible.contains($0) }
        store.setVisibleLocations(ordered)
    }

    private func quickButton(_ title: String, icon: String?, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let icon { Image(systemName: icon) }
                Text(title)
            }
            .font(.subheadline.weight(.medium))
            .foregroundStyle(Theme.textPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Theme.secondary, in: RoundedRectangle(cornerRadius: Theme.radius))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Dietary profile

    /// Diets are a *requirement*, not a preference: selecting Vegan hides anything
    /// the hall didn't tag Vegan. Three chips only — the halls tag nothing else.
    private var dietSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("Diet")

            HStack(spacing: 8) {
                ForEach(DietaryTag.diets, id: \.self) { diet in
                    let selected = profile.selectedDiets.contains { DietaryTag.matches($0, diet) }
                    Button { toggleDiet(diet) } label: {
                        TagChip(
                            text: DietaryTag.label(for: diet),
                            style: selected ? .filled : .outline
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(DietaryTag.label(for: diet))
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
                Spacer(minLength: 0)
            }

            caption("Persists until you turn it off.")
        }
    }

    private var allergenSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("My Allergens")
            caption("Applies every day. Tag data comes from the dining hall — absence of a tag doesn't guarantee allergen-free.")

            FlowLayout(spacing: 8, lineSpacing: 8) {
                ForEach(allergenOptions, id: \.self) { allergen in
                    let selected = profile.avoids(allergen)
                    Button { toggleAllergen(allergen) } label: {
                        TagChip(
                            text: allergen,
                            style: selected ? .filled : .outline,
                            font: .footnote.weight(.medium)
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(allergen)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }

            Toggle(isOn: $mayContainUnsafe) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Treat “may contain” as unsafe")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Theme.textPrimary)
                    Text("Items traced with * count as containing it")
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .tint(Theme.primary)
            .padding(.top, 4)

            VStack(alignment: .leading, spacing: 8) {
                sectionLabel("When an item has my allergen")
                Picker("", selection: $conflictModeRaw) {
                    Text("Hide it").tag(DietaryProfile.ConflictMode.hide.rawValue)
                    Text("Show a warning").tag(DietaryProfile.ConflictMode.warn.rawValue)
                }
                .pickerStyle(.segmented)
                .labelsHidden()
            }
            .padding(.top, 4)
        }
    }

    private func toggleDiet(_ diet: String) {
        var diets = profile.selectedDiets
        if let existing = diets.first(where: { DietaryTag.matches($0, diet) }) {
            diets.remove(existing)
        } else {
            diets.insert(diet)
        }
        dietsRaw = DietaryProfile.encode(diets)
    }

    private func toggleAllergen(_ allergen: String) {
        var allergens = profile.avoidedAllergens
        if let existing = allergens.first(where: { DietaryTag.matches($0, allergen) }) {
            allergens.remove(existing)
        } else {
            allergens.insert(allergen)
        }
        allergensRaw = DietaryProfile.encode(allergens)
    }

    /// Allergen tags actually present in the loaded week, unioned with the fixed list
    /// so a newly introduced upstream tag ("Coconut") becomes selectable on its own.
    private func menuAllergens() -> Set<String> {
        var names = Set(DietaryTag.commonAllergens)
        var seen = Set(DietaryTag.commonAllergens.map { $0.lowercased() })
        for items in store.weeklyItems.values {
            for item in items {
                for tag in item.filters where DietaryTag.isAllergen(tag) {
                    let name = DietaryTag.name(tag)
                    if seen.insert(name.lowercased()).inserted { names.insert(name) }
                }
            }
        }
        return names
    }

    private func caption(_ text: String) -> some View {
        Text(text)
            .font(.caption)
            .foregroundStyle(Theme.textSecondary)
            .fixedSize(horizontal: false, vertical: true)
    }

    // MARK: - Visual

    private var visualSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            sectionLabel("Display")

            Toggle(isOn: $expandFolders) {
                Text("Expand All Folders")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.textPrimary)
            }
            .tint(Theme.primary)

            Toggle(isOn: $showNutrition) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Show nutrition")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Theme.textPrimary)
                    Text("Calories, macros & diet tags under each item")
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .tint(Theme.primary)
        }
    }

    /// A small uppercase section heading, matching the sheet's compact styling.
    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(0.6)
            .foregroundStyle(Theme.textSecondary)
    }
}

/// A left-aligned checkbox row with a purple filled check when on (SPEC §2.1.5 screenshot).
private struct CheckboxRow: View {
    let title: String
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: isOn ? "checkmark.square.fill" : "square")
                    .font(.body)
                    .foregroundStyle(isOn ? Theme.primary : Theme.textSecondary)
                Text(title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
            }
            .contentShape(Rectangle())
            .padding(.vertical, 6)
        }
        .buttonStyle(.plain)
    }
}
