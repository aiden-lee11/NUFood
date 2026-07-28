import UIKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging

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
/// That same ordering is why the APNs device token is forwarded to `Messaging`
/// by hand below: Firebase's swizzling snapshots the app delegate once, when
/// `FirebaseApp.configure()` runs, which is before SwiftUI has installed this
/// delegate on `UIApplication`. The swizzler finds nothing and gives up for the
/// life of the process, so relying on it silently starves `Messaging` of the
/// APNs token and no FCM token is ever minted.
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

    /// Hands the APNs token to `Messaging`, which cannot mint an FCM token without
    /// it. `NotificationManager` uploads the resulting token from its `MessagingDelegate`.
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        guard FirebaseApp.app() != nil else { return }
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Push: APNs registration failed: \(error)")
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge]
    }
}
