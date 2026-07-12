import SwiftUI

/// Shared full-width "Sign in with Google" button used by `AuthPromptSheet` and the
/// signed-out Account sheet. Filled with `Theme.primary`; shows a spinner and the
/// working title while a sign-in is in flight.
struct GoogleSignInButton: View {
    var isWorking: Bool
    var workingTitle: String = "Signing in..."
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isWorking {
                    ProgressView()
                        .controlSize(.small)
                        .tint(Theme.primaryForeground)
                } else {
                    Image(systemName: "g.circle.fill")
                        .font(.title3)
                }
                Text(isWorking ? workingTitle : "Sign in with Google")
                    .font(.body.weight(.semibold))
            }
            .foregroundStyle(Theme.primaryForeground)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Theme.primary, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(isWorking)
    }
}
