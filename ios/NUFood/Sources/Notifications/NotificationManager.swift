import Foundation
import SwiftUI
import UIKit
import UserNotifications
import FirebaseMessaging

/// Owns the favorite-menu push flow: the system permission status, a per-device
/// opt-in preference, and registration of the FCM token with the backend.
///
/// Injected via `.environment` like `AuthManager`. Firebase swizzling is left on,
/// so the FCM token is read with `Messaging.messaging().token()` and refreshes
/// arrive through `MessagingRegistrationTokenRefreshed`; both re-upload only while
/// signed in and opted in.
@Observable
@MainActor
final class NotificationManager {
    private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined

    /// Per-device opt-in for favorites alerts. Only meaningful while signed in.
    private(set) var pushEnabled: Bool

    private let auth: AuthManager
    private let api: APIClient

    /// Last token uploaded, kept so the disable / sign-out flows can delete it.
    private var cachedToken: String?
    private var refreshObserver: NSObjectProtocol?

    init(auth: AuthManager) {
        self.auth = auth
        self.api = APIClient(tokenProvider: { [weak auth] in try await auth?.idToken() })
        self.pushEnabled = UserDefaults.standard.bool(forKey: Keys.pushEnabled)
        observeTokenRefresh()
    }

    // MARK: - Status

    func refreshAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorizationStatus = settings.authorizationStatus
    }

    // MARK: - Toggle flows

    /// Requests permission (once), registers for remote notifications, and uploads
    /// the FCM token. On denial `pushEnabled` stays false so the UI can point at Settings.
    func enable() async {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        await refreshAuthorizationStatus()
        guard granted else {
            setPushEnabled(false)
            return
        }
        setPushEnabled(true)
        UIApplication.shared.registerForRemoteNotifications()
        await uploadToken()
    }

    /// Opts out and deletes the token from the backend; the system permission is left as-is.
    func disable() async {
        setPushEnabled(false)
        await deleteToken()
    }

    // MARK: - Auth lifecycle

    /// Re-uploads the token after a fresh sign-in (a new user needs its own registration).
    func handleSignedIn() async {
        guard pushEnabled else { return }
        await uploadToken()
    }

    /// Best-effort token deletion while the Firebase token is still valid; call before signing out.
    func handleWillSignOut() async {
        await deleteToken()
    }

    // MARK: - Token plumbing

    private func uploadToken() async {
        guard auth.isSignedIn, pushEnabled else { return }
        do {
            let token = try await Messaging.messaging().token()
            cachedToken = token
            try await api.registerDeviceToken(token)
        } catch {
            print("Device token upload failed: \(error)")
        }
    }

    private func deleteToken() async {
        var token = cachedToken
        if token == nil {
            token = try? await Messaging.messaging().token()
        }
        guard let token else { return }
        try? await api.unregisterDeviceToken(token)
    }

    private func observeTokenRefresh() {
        refreshObserver = NotificationCenter.default.addObserver(
            forName: .MessagingRegistrationTokenRefreshed,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in await self?.uploadToken() }
        }
    }

    private func setPushEnabled(_ value: Bool) {
        pushEnabled = value
        UserDefaults.standard.set(value, forKey: Keys.pushEnabled)
    }

    private enum Keys {
        static let pushEnabled = "nufood.pushEnabled"
    }
}
