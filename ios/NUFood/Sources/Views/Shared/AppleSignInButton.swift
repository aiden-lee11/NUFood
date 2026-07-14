import SwiftUI

/// Shared full-width "Sign in with Apple" button, matching the layout of
/// `GoogleSignInButton`. Follows Apple's HIG contrast guidance: a black button in
/// light mode and a white button in dark mode (the app applies its theme at the
/// window level, so `colorScheme` reflects the active appearance). Shows a spinner
/// and the working title while an authorization is in flight.
struct AppleSignInButton: View {
    @Environment(\.colorScheme) private var colorScheme
    var isWorking: Bool
    var workingTitle: String = "Signing in..."
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isWorking {
                    ProgressView()
                        .controlSize(.small)
                        .tint(foreground)
                } else {
                    Image(systemName: "apple.logo")
                        .font(.title3)
                }
                Text(isWorking ? workingTitle : "Sign in with Apple")
                    .font(.body.weight(.semibold))
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(background, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(isWorking)
    }

    private var background: Color { colorScheme == .dark ? .white : .black }
    private var foreground: Color { colorScheme == .dark ? .black : .white }
}
