import SwiftUI

/// Bottom toast rendering `AppStore.transientError` (web parity with the
/// destructive sonner toast). Attached once at the tab root so it shows over
/// whichever screen is active. Auto-dismisses after 4s; tap to dismiss early.
struct TransientErrorToastModifier: ViewModifier {
    @Environment(AppStore.self) private var store

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .bottom) {
                if let message = store.transientError {
                    Text(message)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 16)
                        .background(Theme.destructive, in: RoundedRectangle(cornerRadius: Theme.radius))
                        .padding(.horizontal, 24)
                        // Sits above the tab bar rather than behind it.
                        .padding(.bottom, 56)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .onTapGesture { store.transientError = nil }
                        .task(id: message) {
                            try? await Task.sleep(for: .seconds(4))
                            if store.transientError == message { store.transientError = nil }
                        }
                        .accessibilityLabel(message)
                }
            }
            .animation(.easeInOut(duration: 0.2), value: store.transientError)
    }
}

extension View {
    func transientErrorToast() -> some View {
        modifier(TransientErrorToastModifier())
    }
}
