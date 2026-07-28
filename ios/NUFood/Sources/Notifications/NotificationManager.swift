import Foundation
import SwiftUI
import UIKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging

/// Owns the favorite-menu push flow: the system permission status, a per-device
/// opt-in preference, and registration of the FCM token with the backend.
///
/// Injected via `.environment` like `AuthManager`. Token delivery is event-driven:
/// `AppDelegate` forwards the APNs token to `Messaging`, Firebase mints the FCM
/// token, and `messaging(_:didReceiveRegistrationToken:)` below is the first moment
/// that token actually exists. Reading it any earlier (right after asking for APNs
/// registration, say) loses a race and throws, so every upload flows through that
/// callback — or through the token it cached. Uploads only happen while signed in
/// and opted in.
@Observable
@MainActor
final class NotificationManager: NSObject, MessagingDelegate {
    private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined

    /// Per-device opt-in for favorites alerts. Only meaningful while signed in.
    private(set) var pushEnabled: Bool

    private let auth: AuthManager
    private let api: APIClient

    /// Last token Firebase handed over, kept so a later sign-in can upload it and
    /// the disable / sign-out flows can delete it.
    private var cachedToken: String?

    init(auth: AuthManager) {
        self.auth = auth
        self.api = APIClient(tokenProvider: { [weak auth] in try await auth?.idToken() })
        self.pushEnabled = UserDefaults.standard.bool(forKey: Keys.pushEnabled)
        super.init()
        // Set before APNs can answer, so the first token Firebase mints is seen.
        if FirebaseApp.app() != nil {
            Messaging.messaging().delegate = self
        }
    }

    // MARK: - Status

    func refreshAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorizationStatus = settings.authorizationStatus
    }

    // MARK: - Launch

    /// Launch-time setup. APNs registration does not persist across launches, so it
    /// has to be requested on every start for an already opted-in device; otherwise
    /// no APNs token arrives, no FCM token is minted, and the device is never
    /// reachable. Only the toggle itself asks for permission.
    func prepareForLaunch() async {
        await refreshAuthorizationStatus()
        registerForRemoteNotificationsIfNeeded()
    }

    private func registerForRemoteNotificationsIfNeeded() {
        guard pushEnabled else { return }
        guard authorizationStatus == .authorized || authorizationStatus == .provisional else { return }
        UIApplication.shared.registerForRemoteNotifications()
    }

    // MARK: - Toggle flows

    /// Requests permission (once) and registers for remote notifications. The upload
    /// follows from the registration-token callback; on denial `pushEnabled` stays
    /// false so the UI can point at Settings.
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
        // Re-enabling within the same launch keeps the existing token, so Firebase
        // has no refresh to report and the cached copy is what gets re-uploaded.
        await uploadCachedToken()
    }

    /// Opts out and deletes the token from the backend; the system permission is left as-is.
    func disable() async {
        setPushEnabled(false)
        await deleteToken()
    }

    // MARK: - Auth lifecycle

    /// Re-uploads the token after a fresh sign-in (a new user needs its own registration).
    func handleSignedIn() async {
        await uploadCachedToken()
    }

    /// Best-effort token deletion while the Firebase token is still valid; call before signing out.
    func handleWillSignOut() async {
        await deleteToken()
    }

    // MARK: - MessagingDelegate

    /// Fires once Firebase has an FCM token — after `AppDelegate` forwards the APNs
    /// token — and again whenever it rotates. Arrives off the main actor.
    nonisolated func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        Task { @MainActor in
            cachedToken = fcmToken
            await uploadToken(fcmToken)
        }
    }

    // MARK: - Token plumbing

    private func uploadCachedToken() async {
        guard let cachedToken else { return }
        await uploadToken(cachedToken)
    }

    private func uploadToken(_ token: String) async {
        guard auth.isSignedIn, pushEnabled else { return }
        do {
            try await api.registerDeviceToken(token)
        } catch {
            print("Push: device token upload failed: \(error)")
        }
    }

    /// Falls back to asking Firebase directly when this launch never saw the
    /// registration callback; that fetch throws when APNs has not answered, which
    /// only means there is no registration to remove.
    private func deleteToken() async {
        var token = cachedToken
        if token == nil, FirebaseApp.app() != nil {
            token = try? await Messaging.messaging().token()
        }
        guard let token else { return }
        do {
            try await api.unregisterDeviceToken(token)
        } catch {
            print("Push: device token removal failed: \(error)")
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
