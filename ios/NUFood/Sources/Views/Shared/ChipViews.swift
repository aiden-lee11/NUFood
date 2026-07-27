import SwiftUI

/// Visual treatments for `TagChip`, covering every chip the dietary surfaces need.
enum ChipStyle {
    /// Selected state: solid tint with knocked-out text (Display Settings chips).
    case filled
    /// Unselected state: card surface with a hairline border (matches the meal chips).
    case outline
    /// Read-only tag: tinted text on a low-opacity wash of the same hue.
    case soft
}

/// A small capsule tag. Used for the diet/allergen pickers in Display Settings and
/// for the read-only tag rows in the nutrition detail sheet.
struct TagChip: View {
    let text: String
    var tint: Color = Theme.primary
    var style: ChipStyle = .outline
    var font: Font = .subheadline.weight(.medium)

    var body: some View {
        Text(text)
            .font(font)
            .foregroundStyle(foreground)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(background, in: Capsule())
            .overlay(
                Capsule().stroke(style == .outline ? Theme.border : Color.clear, lineWidth: 1)
            )
            .fixedSize(horizontal: true, vertical: false)
    }

    private var foreground: Color {
        switch style {
        case .filled: return Theme.primaryForeground
        case .outline: return Theme.textPrimary
        case .soft: return tint
        }
    }

    private var background: Color {
        switch style {
        case .filled: return tint
        case .outline: return Theme.card
        case .soft: return tint.opacity(0.15)
        }
    }
}

/// A left-aligned wrapping row of views — SwiftUI has no built-in flow container and
/// `LazyVGrid` would force every chip to a uniform column width, which reads badly for
/// a list mixing "Egg" with "Good Source of Protein".
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    var lineSpacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = rows(maxWidth: proposal.width ?? .infinity, subviews: subviews)
        let height = rows.reduce(0) { $0 + $1.height }
            + CGFloat(max(0, rows.count - 1)) * lineSpacing
        return CGSize(width: proposal.width ?? (rows.map(\.width).max() ?? 0), height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in rows(maxWidth: bounds.width, subviews: subviews) {
            var x = bounds.minX
            for index in row.indices {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(
                    at: CGPoint(x: x, y: y + (row.height - size.height) / 2),
                    proposal: ProposedViewSize(size)
                )
                x += size.width + spacing
            }
            y += row.height + lineSpacing
        }
    }

    private struct Row {
        var indices: [Int] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func rows(maxWidth: CGFloat, subviews: Subviews) -> [Row] {
        var rows: [Row] = []
        var current = Row()
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            let projected = current.indices.isEmpty ? size.width : current.width + spacing + size.width
            if projected > maxWidth, !current.indices.isEmpty {
                rows.append(current)
                current = Row(indices: [index], width: size.width, height: size.height)
            } else {
                current.indices.append(index)
                current.width = projected
                current.height = max(current.height, size.height)
            }
        }
        if !current.indices.isEmpty { rows.append(current) }
        return rows
    }
}
