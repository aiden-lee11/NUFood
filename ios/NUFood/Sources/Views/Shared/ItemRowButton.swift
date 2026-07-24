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
    private let subtitle: String?
    private let onInfo: (() -> Void)?
    private let action: () -> Void

    /// - `subtitle`: optional one-line caption under the name (Option C inline macros).
    ///   When nil the row renders exactly as before.
    /// - `onInfo`: optional handler for a quiet ⓘ button that sits left of the star
    ///   (Option A). When nil no ⓘ is drawn and the row renders exactly as before.
    ///   The ⓘ is an independent overlay button so tapping it can't mis-favorite.
    init(
        name: String,
        isFavorite: Bool,
        style: ItemRowStyle = .standard,
        subtitle: String? = nil,
        onInfo: (() -> Void)? = nil,
        action: @escaping () -> Void
    ) {
        self.name = name
        self.isFavorite = isFavorite
        self.style = style
        self.subtitle = subtitle
        self.onInfo = onInfo
        self.action = action
    }

    /// Hit target for the ⓘ button; also the space reserved for its glyph in the row.
    private static let infoHitSize: CGFloat = 44
    /// Fixed star column so the ⓘ overlay lines up deterministically to its left.
    private static let starWidth: CGFloat = 16

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 6) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.subheadline.weight(.medium))
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    if let subtitle {
                        // Keep the macro caption on a single line so a row's height
                        // stays stable: shrink to fit first (typical strings fit with
                        // no visible scaling), truncating only as a last resort.
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(subtitleColor)
                            .lineLimit(1)
                            .minimumScaleFactor(0.65)
                    }
                }
                if onInfo == nil {
                    Text(isFavorite ? "★" : "☆")
                        .font(.subheadline)
                    Spacer(minLength: 0)
                } else {
                    Spacer(minLength: 8)
                    // Reserve the ⓘ column; the real button lives in `infoOverlay`
                    // so its tap stays independent of the row's favorite toggle.
                    Color.clear.frame(width: Self.infoHitSize, height: 1)
                    Text(isFavorite ? "★" : "☆")
                        .font(.subheadline)
                        .frame(width: Self.starWidth)
                }
            }
            .foregroundStyle(textColor)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(backgroundColor, in: shape)
            .overlay(shape.strokeBorder(borderColor, lineWidth: 2))
        }
        .buttonStyle(PressScaleButtonStyle())
        .overlay { infoOverlay }
    }

    /// The quiet ⓘ button, laid out to land exactly over the reserved column in the
    /// row's label (same trailing widths + padding), just to the left of the star.
    @ViewBuilder
    private var infoOverlay: some View {
        if let onInfo {
            HStack(spacing: 6) {
                Spacer(minLength: 0)
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onInfo()
                } label: {
                    Image(systemName: "info.circle")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                        .frame(width: Self.infoHitSize, height: Self.infoHitSize)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Nutrition info for \(name)")
                Color.clear.frame(width: Self.starWidth)
            }
            .padding(.horizontal, 16)
        }
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

    /// Inline-macro caption color: muted secondary, or the selected text hue at
    /// reduced opacity on favorited rows so it stays legible on the purple fill.
    private var subtitleColor: Color {
        isFavorite ? Theme.itemSelectedText.opacity(0.75) : Theme.textSecondary
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
