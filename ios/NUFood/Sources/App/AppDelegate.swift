import UIKit
import UserNotifications
import FirebaseCore

/// Minimal UIKit bridge for the pure-SwiftUI app. Owns the single
/// `FirebaseApp.configure()` (runs before `App.init()`, so `AuthManager` and
/// `Messaging` both find a configured app) and presents foreground pushes as banners.
///
/// Firebase's method swizzling is left enabled, so the APNs device token is
/// forwarded to `Messaging` automatically and no `didRegisterForRemoteNotifications`
/// handler is needed here.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
            FirebaseApp.configure()
        }
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
