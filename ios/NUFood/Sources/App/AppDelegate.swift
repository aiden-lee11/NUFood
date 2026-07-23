import UIKit
import UserNotifications
import FirebaseCore

/// Minimal UIKit bridge for the pure-SwiftUI app. Owns the single
/// `FirebaseApp.configure()`, exposed as `configureFirebaseIfNeeded()`.
///
/// Ordering constraint: SwiftUI runs `NUFoodApp.init()` *before* any
/// `UIApplicationDelegate` lifecycle method, and that initializer constructs
/// `AuthManager` (and later `Messaging`), both of which require a configured
/// `FirebaseApp`. So configuration must happen at the top of `App.init()`, not
/// in `didFinishLaunchingWithOptions`. The delegate calls the same idempotent
/// helper defensively, in case the lifecycle order ever differs.
///
/// Firebase's method swizzling is left enabled, so the APNs device token is
/// forwarded to `Messaging` automatically and no `didRegisterForRemoteNotifications`
/// handler is needed here.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    /// Configures Firebase exactly once. Safe to call from both `App.init()` and
    /// the delegate: the `FirebaseApp.app() == nil` guard makes the later call a
    /// no-op. Skips configuration when `GoogleService-Info.plist` is absent so the
    /// app remains usable (and the UI can explain sign-in setup).
    static func configureFirebaseIfNeeded() {
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else { return }
        guard FirebaseApp.app() == nil else { return }
        FirebaseApp.configure()
    }

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        Self.configureFirebaseIfNeeded()
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge]
    }
}
