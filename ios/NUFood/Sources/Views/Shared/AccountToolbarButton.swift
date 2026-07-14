import SwiftUI

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
/// email, a Notifications toggle bound through `store.setMailing`, and a Sign Out action.
/// Both states include "Send Feedback" (mailto) and "Support this project" rows.
private struct AccountSheet: View {
    @Environment(AuthManager.self) private var auth
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var isSigningIn = false
    @State private var signInError: String?

    @State private var isDeleting = false
    @State private var showDeleteConfirm = false
    @State private var deleteError: String?

    private static let feedbackURL = URL(string: "mailto:nufoodfinder@gmail.com?subject=NUFood%20Feedback")
    private static let supportURL = URL(string: "https://buymeacoffee.com/aidenlee11")

    private var mailingBinding: Binding<Bool> {
        Binding(
            get: { store.mailing },
            set: { store.setMailing($0) }
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
            Toggle("Notifications", isOn: mailingBinding)
                .tint(Theme.primary)
                .foregroundStyle(Theme.textPrimary)
                .listRowBackground(Theme.card)
        } footer: {
            Text("Get emailed a list of where your favorites will be at the start of each day!")
                .foregroundStyle(Theme.textSecondary)
        }

        Section {
            Button(role: .destructive) {
                auth.signOut()
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
            if let url = Self.supportURL {
                Link(destination: url) {
                    linkRow(icon: "cup.and.saucer", title: "Support this project")
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
