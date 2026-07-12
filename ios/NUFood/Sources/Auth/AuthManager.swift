import Foundation
import SwiftUI
import UIKit
import FirebaseCore
import FirebaseAuth
import GoogleSignIn

/// Wraps Firebase Auth + Google Sign-In, mirroring the web app's Google-popup flow.
///
/// The app stays fully usable without auth (general menu data); signing in unlocks
/// favorites, nutrition goals, mailing, and synced display preferences.
/// If GoogleService-Info.plist is absent from the bundle, Firebase is never
/// configured and `isConfigured` stays false so the UI can explain setup.
@Observable
@MainActor
final class AuthManager {
    private(set) var isConfigured = false
    private(set) var user: AuthUser?
    var isSignedIn: Bool { user != nil }

    /// True once Firebase has reported the persisted auth state (or immediately when
    /// Firebase isn't configured). Data loading waits on this so a signed-in user
    /// doesn't get a signed-out fetch on cold launch (SPEC §3.3 authLoading gate).
    private(set) var hasResolvedInitialState = false

    struct AuthUser: Equatable {
        let uid: String
        let displayName: String?
        let email: String?
        let photoURL: URL?
    }

    private var listenerHandle: AuthStateDidChangeListenerHandle?

    init() {
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            hasResolvedInitialState = true
            return
        }
        FirebaseApp.configure()
        isConfigured = true
        listenerHandle = Auth.auth().addStateDidChangeListener { [weak self] _, firebaseUser in
            Task { @MainActor in
                self?.user = firebaseUser.map {
                    AuthUser(uid: $0.uid, displayName: $0.displayName, email: $0.email, photoURL: $0.photoURL)
                }
                self?.hasResolvedInitialState = true
            }
        }
    }

    /// Suspends until Firebase reports the persisted auth state (bounded at ~5s).
    func waitUntilResolved() async {
        for _ in 0..<100 {
            if hasResolvedInitialState { return }
            try? await Task.sleep(for: .milliseconds(50))
        }
    }

    /// Fresh Firebase ID token for Authorization: Bearer headers. Nil when signed out.
    func idToken() async throws -> String? {
        guard isConfigured, let current = Auth.auth().currentUser else { return nil }
        return try await current.getIDToken()
    }

    func signInWithGoogle() async throws {
        guard isConfigured else { throw AuthError.notConfigured }
        guard let clientID = FirebaseApp.app()?.options.clientID else { throw AuthError.notConfigured }
        guard let presenter = Self.topViewController() else { throw AuthError.noPresenter }

        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
        guard let idToken = result.user.idToken?.tokenString else { throw AuthError.missingToken }
        let credential = GoogleAuthProvider.credential(
            withIDToken: idToken,
            accessToken: result.user.accessToken.tokenString
        )
        try await Auth.auth().signIn(with: credential)
    }

    func signOut() {
        guard isConfigured else { return }
        try? Auth.auth().signOut()
        GIDSignIn.sharedInstance.signOut()
    }

    /// Handles the Google Sign-In redirect URL.
    func handle(url: URL) -> Bool {
        GIDSignIn.sharedInstance.handle(url)
    }

    enum AuthError: LocalizedError {
        case notConfigured
        case noPresenter
        case missingToken

        var errorDescription: String? {
            switch self {
            case .notConfigured:
                return "Sign-in isn't set up yet: add GoogleService-Info.plist (from the Firebase console, after registering an iOS app) to NUFood/Resources and rebuild."
            case .noPresenter:
                return "Could not find a window to present sign-in."
            case .missingToken:
                return "Google sign-in did not return an ID token."
            }
        }
    }

    private static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        var top = scene?.windows.first(where: \.isKeyWindow)?.rootViewController
        while let presented = top?.presentedViewController {
            top = presented
        }
        return top
    }
}
