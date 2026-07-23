import Foundation
import Security
import SwiftUI
import UIKit
import CryptoKit
import AuthenticationServices
import FirebaseCore
import FirebaseAuth
import GoogleSignIn

/// Wraps Firebase Auth + Google / Apple Sign-In, mirroring the web app's Google-popup flow.
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

    /// Retained for the lifetime of an in-flight Apple authorization (the controller
    /// only holds a weak reference to its delegate/presentation-context provider).
    private var appleSignInCoordinator: AppleSignInCoordinator?

    init() {
        // FirebaseApp.configure() runs in AppDelegate.didFinishLaunchingWithOptions,
        // which fires before this initializer; a configured app is the signal that
        // GoogleService-Info.plist was present.
        guard FirebaseApp.app() != nil else {
            hasResolvedInitialState = true
            return
        }
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

    // MARK: - Google

    func signInWithGoogle() async throws {
        let credential = try await googleCredential()
        try await Auth.auth().signIn(with: credential)
    }

    /// Runs the Google popup flow and returns a Firebase credential (reused for reauth).
    private func googleCredential() async throws -> AuthCredential {
        guard isConfigured else { throw AuthError.notConfigured }
        guard let clientID = FirebaseApp.app()?.options.clientID else { throw AuthError.notConfigured }
        guard let presenter = Self.topViewController() else { throw AuthError.noPresenter }

        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
        guard let idToken = result.user.idToken?.tokenString else { throw AuthError.missingToken }
        return GoogleAuthProvider.credential(
            withIDToken: idToken,
            accessToken: result.user.accessToken.tokenString
        )
    }

    // MARK: - Apple

    func signInWithApple() async throws {
        guard isConfigured else { throw AuthError.notConfigured }
        let rawNonce = Self.randomNonceString()
        let appleCredential = try await performAppleAuthorization(hashedNonce: Self.sha256(rawNonce))
        guard let tokenData = appleCredential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            throw AuthError.missingToken
        }
        let fullName = appleCredential.fullName
        // Apple only returns fullName on the *first* authorization for this Apple ID;
        // passing it into the Firebase credential populates displayName then.
        let firebaseCredential = OAuthProvider.appleCredential(
            withIDToken: idToken,
            rawNonce: rawNonce,
            fullName: fullName
        )
        let result = try await Auth.auth().signIn(with: firebaseCredential)

        // Belt-and-suspenders: if Firebase didn't pick up a display name but Apple
        // gave us one this time, write it onto the Firebase profile.
        if result.user.displayName?.isEmpty ?? true, let fullName {
            let formatter = PersonNameComponentsFormatter()
            let name = formatter.string(from: fullName)
            if !name.isEmpty {
                let change = result.user.createProfileChangeRequest()
                change.displayName = name
                try? await change.commitChanges()
                self.user = self.user.map {
                    AuthUser(uid: $0.uid, displayName: name, email: $0.email, photoURL: $0.photoURL)
                }
            }
        }
    }

    /// Runs the Apple authorization sheet and returns a Firebase credential (reused for reauth).
    private func appleCredential() async throws -> AuthCredential {
        let rawNonce = Self.randomNonceString()
        let appleCredential = try await performAppleAuthorization(hashedNonce: Self.sha256(rawNonce))
        guard let tokenData = appleCredential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            throw AuthError.missingToken
        }
        return OAuthProvider.appleCredential(
            withIDToken: idToken,
            rawNonce: rawNonce,
            fullName: appleCredential.fullName
        )
    }

    private func performAppleAuthorization(hashedNonce: String) async throws -> ASAuthorizationAppleIDCredential {
        let coordinator = AppleSignInCoordinator()
        appleSignInCoordinator = coordinator
        defer { appleSignInCoordinator = nil }
        return try await coordinator.performRequest(hashedNonce: hashedNonce)
    }

    // MARK: - Sign out / delete

    func signOut() {
        guard isConfigured else { return }
        try? Auth.auth().signOut()
        GIDSignIn.sharedInstance.signOut()
    }

    /// Deletes the account everywhere: first the server-side data (backend owns
    /// favorites/goals/prefs), then the Firebase user. If Firebase requires a recent
    /// login, we transparently re-run the user's original provider flow and retry.
    /// Callers are responsible for wiping local caches afterward.
    func deleteAccount(using api: APIClient) async throws {
        guard isConfigured, let user = Auth.auth().currentUser else { throw AuthError.notConfigured }

        // 1. Server-side deletion first, while we still have a valid ID token.
        try await api.deleteAccount()

        // 2. Delete the Firebase user, reauthenticating if the session is too old.
        do {
            try await user.delete()
        } catch let error as NSError where error.code == AuthErrorCode.requiresRecentLogin.rawValue {
            try await reauthenticate(user)
            try await user.delete()
        }
    }

    /// Re-runs the sign-in flow for whichever provider the user is linked with, so a
    /// stale session can complete a sensitive operation (account deletion).
    private func reauthenticate(_ user: User) async throws {
        let providerIDs = Set(user.providerData.map(\.providerID))
        let credential: AuthCredential
        if providerIDs.contains("apple.com") {
            credential = try await appleCredential()
        } else if providerIDs.contains("google.com") {
            credential = try await googleCredential()
        } else {
            throw AuthError.reauthRequired
        }
        try await user.reauthenticate(with: credential)
    }

    /// Handles the Google Sign-In redirect URL.
    func handle(url: URL) -> Bool {
        GIDSignIn.sharedInstance.handle(url)
    }

    enum AuthError: LocalizedError {
        case notConfigured
        case noPresenter
        case missingToken
        case appleAuthorizationFailed
        case reauthRequired

        var errorDescription: String? {
            switch self {
            case .notConfigured:
                return "Sign-in isn't set up yet: add GoogleService-Info.plist (from the Firebase console, after registering an iOS app) to NUFood/Resources and rebuild."
            case .noPresenter:
                return "Could not find a window to present sign-in."
            case .missingToken:
                return "Sign-in did not return an identity token."
            case .appleAuthorizationFailed:
                return "Apple sign-in did not complete. Please try again."
            case .reauthRequired:
                return "For your security, please sign out, sign back in, and try deleting your account again."
            }
        }
    }

    // MARK: - Nonce helpers (Apple sign-in)

    private static func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let status = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if status != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(status)")
        }
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(randomBytes.map { charset[Int($0) % charset.count] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
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

/// Bridges the delegate/callback-based `ASAuthorizationController` API into async/await.
/// The controller only weakly references its delegate + presentation-context provider,
/// so `AuthManager` retains the coordinator for the duration of the request.
@MainActor
private final class AppleSignInCoordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<ASAuthorizationAppleIDCredential, Error>?

    func performRequest(hashedNonce: String) async throws -> ASAuthorizationAppleIDCredential {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = hashedNonce
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            continuation?.resume(throwing: AuthManager.AuthError.appleAuthorizationFailed)
            continuation = nil
            return
        }
        continuation?.resume(returning: credential)
        continuation = nil
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        return scene?.windows.first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
}
