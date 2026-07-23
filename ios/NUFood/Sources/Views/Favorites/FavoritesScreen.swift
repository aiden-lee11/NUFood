import SwiftUI
import UIKit

/// Your Favorites (`/preferences`) — list & manage favorited item names. SPEC §2.5.
/// Only reachable when signed in (RootView gates the tab), but renders a defensive
/// signed-out fallback anyway.
///
/// Management UX matches the star rows used everywhere else in the app:
///   - tapping a row unfavorites it immediately (persisted), but the row stays in
///     place dimmed with an outline star until the user leaves the screen —
///     tapping again re-favorites it, so a mistap is recoverable in place
///   - swipe a row left for an immediate destructive "Remove" shortcut
///   - a filter field (web Preferences parity) narrows long lists.
struct FavoritesScreen: View {
    @Environment(AppStore.self) private var store
    @Environment(AuthManager.self) private var auth

    @State private var filterText = ""
    @State private var isSigningIn = false
    @State private var signInError: String?

    /// Names unfavorited on this screen that remain visible (dimmed) until the
    /// view disappears or the list is refreshed.
    @State private var pendingRemoved: Set<String> = []

    var body: some View {
        NavigationStack {
            Group {
                if !auth.isSignedIn {
                    signedOutContent
                } else if displayedNames.isEmpty {
                    emptyState
                } else {
                    favoritesList
                }
            }
            .background(Theme.background)
            .navigationTitle("Your Favorites")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    ThemeToggleButton()
                    AccountToolbarButton()
                }
            }
            .onDisappear {
                pendingRemoved.removeAll()
            }
        }
    }

    // MARK: - Favorites list

    private var favoritesList: some View {
        List {
            Section {
            } header: {
                VStack(alignment: .leading, spacing: 12) {
                    header
                    filterField
                }
                .textCase(nil)
            }

            if visibleNames.isEmpty {
                Section {
                    Text("No favorites match \"\(filterText.trimmingCharacters(in: .whitespaces))\"")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                        .listRowBackground(Theme.card)
                }
            } else {
                Section {
                    ForEach(visibleNames, id: \.self) { name in
                        row(name)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .refreshable {
            await store.refresh()
            withAnimation { pendingRemoved.removeAll() }
        }
    }

    private func row(_ name: String) -> some View {
        FavoriteRow(name: name, isPending: isPending(name)) {
            toggleRow(name)
        }
        .listRowBackground(Theme.card)
        .listRowSeparatorTint(Theme.border)
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive) {
                removeNow(name)
            } label: {
                Label("Remove", systemImage: "star.slash")
            }
            .tint(Theme.destructive)
            .accessibilityLabel("Remove \(name) from favorites")
        }
    }

    private var filterField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Theme.textSecondary)
            TextField("Filter favorites...", text: $filterText)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .foregroundStyle(Theme.textPrimary)
        }
        .padding(12)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radius)
                .stroke(Theme.border, lineWidth: 1)
        )
    }

    // MARK: - Header / empty / signed-out

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Your Favorite Items")
                .font(.title.bold())
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if auth.isSignedIn {
                Text(countText)
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var emptyState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                VStack(spacing: 12) {
                    Image(systemName: "star.slash")
                        .font(.system(size: 44))
                        .foregroundStyle(Theme.textSecondary)
                    Text("No favorites yet")
                        .font(.headline)
                        .foregroundStyle(Theme.textPrimary)
                    Text("Tap any item to save it to your favorites.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(32)
                .frame(maxWidth: .infinity)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .refreshable { await store.refresh() }
    }

    private var signedOutContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                signedOutFallback
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var signedOutFallback: some View {
        VStack(spacing: 20) {
            VStack(spacing: 12) {
                Image(systemName: "star")
                    .font(.system(size: 44))
                    .foregroundStyle(Theme.textSecondary)
                Text("Sign in to start favoriting items.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if let signInError {
                Text(signInError)
                    .font(.footnote)
                    .foregroundStyle(Theme.destructive)
                    .multilineTextAlignment(.center)
            }

            GoogleSignInButton(isWorking: isSigningIn) {
                signIn { try await auth.signInWithGoogle() }
            }

            AppleSignInButton(isWorking: isSigningIn) {
                signIn { try await auth.signInWithApple() }
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity)
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

    // MARK: - Data / actions

    /// Current favorites plus pending-removed rows, so an unfavorited row holds
    /// its place until the user leaves the screen.
    private var displayedNames: [String] {
        store.favorites.union(pendingRemoved)
            .sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending }
    }

    /// Displayed rows filtered live by the search text.
    private var visibleNames: [String] {
        let query = filterText.trimmingCharacters(in: .whitespaces).lowercased()
        guard !query.isEmpty else { return displayedNames }
        return displayedNames.filter { $0.lowercased().contains(query) }
    }

    private var countText: String {
        let count = store.favorites.count
        return count == 1 ? "1 item" : "\(count) items"
    }

    private func isPending(_ name: String) -> Bool {
        !store.favorites.contains(name)
    }

    private func toggleRow(_ name: String) {
        withAnimation {
            if store.favorites.contains(name) {
                pendingRemoved.insert(name)
            } else {
                pendingRemoved.remove(name)
            }
            store.toggleFavorite(name)
        }
    }

    private func removeNow(_ name: String) {
        withAnimation {
            if store.favorites.contains(name) {
                store.removeFavorites([name])
            }
            pendingRemoved.remove(name)
        }
    }
}

// MARK: - Favorite row

/// One favorite: leading star in the app accent, plain name. Tapping toggles —
/// a pending-removed row dims, swaps to an outline star, and shows a re-add hint.
private struct FavoriteRow: View {
    let name: String
    let isPending: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 10) {
                Image(systemName: isPending ? "star" : "star.fill")
                    .font(.subheadline)
                    .foregroundStyle(isPending ? Theme.textSecondary : Theme.primary)
                Text(name)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(isPending ? Theme.textSecondary : Theme.textPrimary)
                Spacer(minLength: 0)
                if isPending {
                    Text("Tap to re-add")
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .padding(.vertical, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(name)
        .accessibilityValue(isPending ? "Removed from favorites" : "Favorited")
        .accessibilityHint(isPending ? "Tap to add back to favorites" : "Tap to remove from favorites")
    }
}
