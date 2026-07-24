import SwiftUI
import UIKit

/// Toolbar button (person icon) presenting the Account sheet (SPEC §2.7).
struct AccountToolbarButton: View {
    @State private var isPresented = false

    init() {}

    var body: some View {
        Button {
            isPresented = true
        } label: {
            Image(systemName: "person.crop.circle")
                .imageScale(.large)
        }
        .accessibilityLabel("Account")
        .sheet(isPresented: $isPresented) {
            AccountSheet()
        }
    }
}

/// The Account sheet contents. Signed out → offers Google sign-in; signed in → shows the
/// email, a "Favorites alerts" push toggle, and a Sign Out action.
/// Both states include a "Send Feedback" (mailto) row. The web app's "Support this project"
/// donation link is intentionally omitted on iOS — App Store guideline 3.1.1 requires donations
/// for digital content/services to go through In-App Purchase.
private struct AccountSheet: View {
    @Environment(AuthManager.self) private var auth
    @Environment(AppStore.self) private var store
    @Environment(NotificationManager.self) private var notifications
    @Environment(\.dismiss) private var dismiss

    @State private var isSigningIn = false
    @State private var signInError: String?

    @State private var isDeleting = false
    @State private var showDeleteConfirm = false
    @State private var deleteError: String?

    private static let feedbackURL = URL(string: "mailto:nufoodfinder@gmail.com?subject=NUFood%20Feedback")

    private var favoritesAlertsBinding: Binding<Bool> {
        Binding(
            get: { notifications.pushEnabled },
            set: { on in
                Task { on ? await notifications.enable() : await notifications.disable() }
            }
        )
    }

    var body: some View {
        NavigationStack {
            List {
                if auth.isSignedIn {
                    signedInSections
                } else {
                    signedOutSections
                }
                linksSection
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle(auth.isSignedIn ? "Account Information" : "Sign In")
            .navigationBarTitleDisplayMode(.inline)
            .task { await notifications.refreshAuthorizationStatus() }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .disabled(isDeleting)
                }
            }
            .alert("Delete Account?", isPresented: $showDeleteConfirm) {
                Button("Delete", role: .destructive) { deleteAccount() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This permanently deletes your account. Your favorites, nutrition goals, and preferences will be permanently deleted. This cannot be undone.")
            }
            .alert(
                "Couldn't Delete Account",
                isPresented: Binding(get: { deleteError != nil }, set: { if !$0 { deleteError = nil } })
            ) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(deleteError ?? "")
            }
        }
    }

    // MARK: - Signed in

    @ViewBuilder
    private var signedInSections: some View {
        Section {
            HStack {
                Text("Email")
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
                Text(auth.user?.email ?? "—")
                    .foregroundStyle(Theme.textSecondary)
            }
            .listRowBackground(Theme.card)
        } header: {
            Text("Manage your account settings and preferences.")
                .foregroundStyle(Theme.textSecondary)
                .textCase(nil)
        }

        Section {
            Toggle("Favorites alerts", isOn: favoritesAlertsBinding)
                .tint(Theme.primary)
                .foregroundStyle(Theme.textPrimary)
                .listRowBackground(Theme.card)
        } footer: {
            VStack(alignment: .leading, spacing: 8) {
                Text("Get a push 30 minutes before each meal when your favorites are on the menu.")
                    .foregroundStyle(Theme.textSecondary)
                if notifications.authorizationStatus == .denied {
                    Button("Open Settings") { openSettings() }
                        .font(.footnote)
                        .foregroundStyle(Theme.primary)
                }
            }
        }

        Section {
            Button(role: .destructive) {
                Task {
                    await notifications.handleWillSignOut()
                    auth.signOut()
                }
            } label: {
                Text("Sign Out")
                    .frame(maxWidth: .infinity)
                    .foregroundStyle(Theme.destructive)
            }
            .disabled(isDeleting)
            .listRowBackground(Theme.card)
        }

        Section {
            Button(role: .destructive) {
                showDeleteConfirm = true
            } label: {
                HStack(spacing: 8) {
                    if isDeleting {
                        ProgressView()
                            .controlSize(.small)
                            .tint(Theme.destructive)
                    }
                    Text(isDeleting ? "Deleting Account..." : "Delete Account")
                        .foregroundStyle(Theme.destructive)
                }
                .frame(maxWidth: .infinity)
            }
            .disabled(isDeleting)
            .listRowBackground(Theme.card)
        } footer: {
            Text("Permanently deletes your account. Your favorites, nutrition goals, and preferences will be permanently deleted.")
                .foregroundStyle(Theme.textSecondary)
        }
    }

    // MARK: - Signed out

    @ViewBuilder
    private var signedOutSections: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                Text("Get the best out of our app by signing in!")
                    .font(.headline)
                    .foregroundStyle(Theme.textPrimary)
                Text("Sign in to save your preferences, access your favorites, and more!")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)

                if let signInError {
                    Text(signInError)
                        .font(.footnote)
                        .foregroundStyle(Theme.destructive)
                }

                GoogleSignInButton(isWorking: isSigningIn) {
                    signIn { try await auth.signInWithGoogle() }
                }
                .padding(.top, 4)

                AppleSignInButton(isWorking: isSigningIn) {
                    signIn { try await auth.signInWithApple() }
                }
            }
            .padding(.vertical, 4)
            .listRowBackground(Theme.card)
        }
    }

    // MARK: - Shared links

    @ViewBuilder
    private var linksSection: some View {
        Section {
            if let url = Self.feedbackURL {
                Link(destination: url) {
                    linkRow(icon: "envelope", title: "Send Feedback")
                }
                .listRowBackground(Theme.card)
            }
        }
    }

    private func linkRow(icon: String, title: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(Theme.primary)
                .frame(width: 24, alignment: .center)
            Text(title)
                .foregroundStyle(Theme.textPrimary)
            Spacer()
            Image(systemName: "arrow.up.right")
                .font(.footnote)
                .foregroundStyle(Theme.textSecondary)
        }
    }

    // MARK: - Actions

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }

    private func signIn(_ operation: @escaping () async throws -> Void) {
        signInError = nil
        isSigningIn = true
        Task {
            defer { isSigningIn = false }
            do {
                try await operation()
            } catch {
                signInError = error.localizedDescription
            }
        }
    }

    private func deleteAccount() {
        deleteError = nil
        isDeleting = true
        Task {
            defer { isDeleting = false }
            do {
                try await store.deleteAccount()
                dismiss()
            } catch {
                deleteError = error.localizedDescription
            }
        }
    }
}
