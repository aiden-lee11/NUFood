import SwiftUI
import UIKit

/// Visual variant of an item row.
/// `.standard` — used everywhere favorited rows border with `Theme.primary`.
/// `.favorite` — used in "My Favorites" accordions; favorited rows border with `Theme.chartFavorites`.
enum ItemRowStyle {
    case standard
    case favorite
}

/// The signature full-width item row used across the app (SPEC §5.3):
/// `Theme.radius` rounded rect, 2pt border, left-aligned name followed by a trailing star.
///
/// - `isFavorite == true`  → `Theme.itemSelected` background, `Theme.itemSelectedText` text,
///   `★` glyph, and a `Theme.primary` border (`.favorite` style swaps the border to
///   `Theme.chartFavorites`, the saturated favorites purple).
/// - `isFavorite == false` → `Theme.card` background, `Theme.border` border,
///   `Theme.textPrimary` text, and a `☆` glyph.
///
/// Tapping fires a light haptic then calls `action`, with a subtle press scale (mirrors the
/// web's hover scale of 1.02).
struct ItemRowButton: View {
    private let name: String
    private let isFavorite: Bool
    private let style: ItemRowStyle
    private let action: () -> Void

    init(name: String, isFavorite: Bool, style: ItemRowStyle = .standard, action: @escaping () -> Void) {
        self.name = name
        self.isFavorite = isFavorite
        self.style = style
        self.action = action
    }

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 6) {
                Text(name)
                    .font(.body.weight(.medium))
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                Text(isFavorite ? "★" : "☆")
                    .font(.body)
                Spacer(minLength: 0)
            }
            .foregroundStyle(textColor)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(backgroundColor, in: shape)
            .overlay(shape.strokeBorder(borderColor, lineWidth: 2))
        }
        .buttonStyle(PressScaleButtonStyle())
    }

    private var shape: RoundedRectangle {
        RoundedRectangle(cornerRadius: Theme.radius, style: .continuous)
    }

    private var backgroundColor: Color {
        isFavorite ? Theme.itemSelected : Theme.card
    }

    private var textColor: Color {
        isFavorite ? Theme.itemSelectedText : Theme.textPrimary
    }

    private var borderColor: Color {
        guard isFavorite else { return Theme.border }
        switch style {
        case .standard: return Theme.primary
        case .favorite: return Theme.chartFavorites
        }
    }
}

/// Subtle grow-on-press interaction matching the web's `hover:scale-[1.02]` + shadow.
private struct PressScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 1.02 : 1)
            .shadow(
                color: Color.black.opacity(configuration.isPressed ? 0.12 : 0),
                radius: configuration.isPressed ? 6 : 0,
                x: 0,
                y: 2
            )
            .animation(.easeOut(duration: 0.18), value: configuration.isPressed)
    }
}
