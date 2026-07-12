import SwiftUI

/// Display Settings dialog (SPEC §2.1.5): three tabs controlling which halls, meals, and
/// folder-expansion behavior appear on the Daily Items screen. Also the first-run onboarding sheet.
struct DisplaySettingsSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("expandFolders") private var expandFolders = false

    @State private var tab: Tab = .locations

    private enum Tab: String, CaseIterable, Identifiable {
        case locations = "Locations"
        case times = "Times"
        case visual = "Visual"
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Picker("Section", selection: $tab) {
                    ForEach(Tab.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                ScrollView {
                    switch tab {
                    case .locations: locationsTab
                    case .times: timesTab
                    case .visual: visualTab
                    }
                }
            }
            .padding(.top)
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

    private var locationsTab: some View {
        VStack(spacing: 12) {
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
            .padding(.top, 8)
        }
        .padding()
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
            .font(.body.weight(.medium))
            .foregroundStyle(Theme.textPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Theme.secondary, in: RoundedRectangle(cornerRadius: Theme.radius))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Times

    private var timesTab: some View {
        VStack(spacing: 4) {
            ForEach(mealPeriodOrder, id: \.self) { meal in
                CheckboxRow(title: meal, isOn: store.visibleTimes.contains(meal)) {
                    toggleMeal(meal)
                }
            }
        }
        .padding()
    }

    private func toggleMeal(_ meal: String) {
        if store.visibleTimes.contains(meal) {
            store.visibleTimes.removeAll { $0 == meal }
        } else {
            // Keep canonical Breakfast/Lunch/Dinner order.
            store.visibleTimes = mealPeriodOrder.filter { store.visibleTimes.contains($0) || $0 == meal }
        }
    }

    // MARK: - Visual

    private var visualTab: some View {
        VStack {
            Toggle(isOn: $expandFolders) {
                Text("Expand All Folders by Default")
                    .foregroundStyle(Theme.textPrimary)
            }
            .tint(Theme.primary)
        }
        .padding()
    }
}

/// A left-aligned checkbox row with a purple filled check when on (SPEC §2.1.5 screenshot).
private struct CheckboxRow: View {
    let title: String
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: isOn ? "checkmark.square.fill" : "square")
                    .font(.title2)
                    .foregroundStyle(isOn ? Theme.primary : Theme.textSecondary)
                Text(title)
                    .font(.title3.weight(.medium))
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
            }
            .contentShape(Rectangle())
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }
}
