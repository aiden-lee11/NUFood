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

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    locationsSection
                    visualSection
                }
                .padding()
            }
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
                    Text("Calories & macros under each item")
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
