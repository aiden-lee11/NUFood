import SwiftUI

/// Toolbar button toggling between light and dark appearance (SPEC §1.2).
/// Reads/writes `@AppStorage("appearance")` (app default `.dark`). Matching the web,
/// it shows a sun icon while in dark mode and a moon icon while in light mode.
struct ThemeToggleButton: View {
    @AppStorage("appearance") private var appearance: AppearanceSetting = .dark
    @Environment(\.colorScheme) private var systemScheme

    init() {}

    var body: some View {
        Button {
            appearance = isDark ? .light : .dark
        } label: {
            Image(systemName: isDark ? "sun.max" : "moon")
                .imageScale(.large)
        }
        .accessibilityLabel(isDark ? "Switch to light mode" : "Switch to dark mode")
    }

    /// Whether the app is currently rendering dark. `.system` resolves via the environment.
    private var isDark: Bool {
        switch appearance {
        case .dark: return true
        case .light: return false
        case .system: return systemScheme == .dark
        }
    }
}
