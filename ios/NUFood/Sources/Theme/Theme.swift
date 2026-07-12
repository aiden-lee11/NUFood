import SwiftUI
import UIKit

/// Rosé Pine palette matching the web app's CSS variables (SPEC §5.1).
/// Light = Rosé Pine Dawn, Dark = Rosé Pine Main (app default).
/// Adjust here only, never inline in views.
enum Theme {
    // Backgrounds
    static let background = dynamic(light: 0xFAF4ED, dark: 0x191724)
    static let card = dynamic(light: 0xFFFAF3, dark: 0x24202F)
    static let secondary = dynamic(light: 0xEDE0D3, dark: 0x2D2A42)  // also muted/border/input
    static let border = dynamic(light: 0xEDE0D3, dark: 0x2D2A42)
    static let itemHover = dynamic(light: 0xF5EFE9, dark: 0x3D3A52)
    static let itemSelected = dynamic(light: 0xDCD3E8, dark: 0x53406E)

    // Text
    static let textPrimary = dynamic(light: 0x4D4668, dark: 0xE6E3F7)
    static let textSecondary = dynamic(light: 0x726A85, dark: 0x9F9BB8)  // muted-foreground
    static let itemSelectedText = dynamic(light: 0x3E3A4F, dark: 0xE4E1F4)

    // Accents (iris)
    static let primary = dynamic(light: 0x8B7AB8, dark: 0xCEADEE)
    static let primaryForeground = dynamic(light: 0xFAF4ED, dark: 0x191724)
    static let accent = dynamic(light: 0xA394C7, dark: 0xB89AD6)

    // Semantic / status
    static let destructive = dynamic(light: 0xC85577, dark: 0xF16D96)  // love
    static let openGreen = dynamic(light: 0x22C55E, dark: 0x22C55E)    // text-green-500
    static let closedRed = dynamic(light: 0xEF4444, dark: 0xEF4444)    // text-red-500
    static let warningYellow = dynamic(light: 0xEAB308, dark: 0xEAB308) // text-yellow-500
    static let gridOpenFill = dynamic(light: 0x16A34A, dark: 0x16A34A) // bg-green-600
    static let nowLine = dynamic(light: 0xEF4444, dark: 0xEF4444)

    // Charts (planner macro rings/bars)
    static let chartLove = dynamic(light: 0xC85577, dark: 0xF16D96)
    static let chartFoam = dynamic(light: 0x4A96A8, dark: 0x9CCFD8)
    static let chartPine = dynamic(light: 0x22577A, dark: 0x31748F)
    static let chartGold = dynamic(light: 0xEB9D13, dark: 0xF6C177)
    static let chartFavorites = dynamic(light: 0xA075D6, dark: 0xE0C1F6)

    /// Standard corner radius (--radius: 0.5rem); location cards use radiusLarge.
    static let radius: CGFloat = 8
    static let radiusLarge: CGFloat = 12

    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

/// User-selectable appearance, mirroring the web header's theme toggle (default dark).
enum AppearanceSetting: String, CaseIterable, Identifiable {
    case system, light, dark

    var id: String { rawValue }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }

    var label: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    var interfaceStyle: UIUserInterfaceStyle {
        switch self {
        case .system: return .unspecified
        case .light: return .light
        case .dark: return .dark
        }
    }

    /// Applies the appearance at the window level instead of via
    /// `preferredColorScheme`, which snaps with no way to animate.
    /// A window-level cross-dissolve fades every view (nav bars, sheets,
    /// tab bar) between themes at once.
    func apply(animated: Bool) {
        let windows = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
        for window in windows where window.overrideUserInterfaceStyle != interfaceStyle {
            let change = { window.overrideUserInterfaceStyle = self.interfaceStyle }
            if animated {
                UIView.transition(
                    with: window,
                    duration: 0.5,
                    options: [.transitionCrossDissolve, .allowUserInteraction],
                    animations: change
                )
            } else {
                change()
            }
        }
    }
}
