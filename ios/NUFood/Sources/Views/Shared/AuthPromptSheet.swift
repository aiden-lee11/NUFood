import SwiftUI

/// Presented when a signed-out user taps to favorite an item (SPEC §2.6).
/// Explains that sign-in is required and offers Google sign-in. Dismisses on success;
/// surfaces any sign-in error (e.g. the not-configured setup guidance) inline.
struct AuthPromptSheet: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss

    @State private var isSigningIn = false
    @State private var errorText: String?

    init() {}

    var body: some View {
        ScrollView {
            content
        }
        .background(Theme.background)
        // .medium fallback keeps the sign-in button reachable when the error
        // text or a large Dynamic Type size pushes content past 280pt.
        .presentationDetents([.height(280), .medium])
        .presentationDragIndicator(.visible)
    }

    private var content: some View {
        VStack(spacing: 20) {
            HStack {
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(Theme.textSecondary)
                }
                .accessibilityLabel("Dismiss")
            }

            VStack(spacing: 8) {
                Text("Not Signed In")
                    .font(.title2.bold())
                    .foregroundStyle(Theme.textPrimary)
                Text("You need to log in to add this item to your favorites.")
                    .font(.body)
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if let errorText {
                Text(errorText)
                    .font(.footnote)
                    .foregroundStyle(Theme.destructive)
                    .multilineTextAlignment(.center)
            }

            GoogleSignInButton(isWorking: isSigningIn) {
                signIn()
            }

            Spacer(minLength: 0)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .top)
    }

    private func signIn() {
        errorText = nil
        isSigningIn = true
        Task {
            defer { isSigningIn = false }
            do {
                try await auth.signInWithGoogle()
                dismiss()
            } catch {
                errorText = error.localizedDescription
            }
        }
    }
}
