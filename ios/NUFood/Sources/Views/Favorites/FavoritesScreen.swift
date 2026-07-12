import SwiftUI

/// Your Favorites (`/preferences`) — list & manage favorited item names. SPEC §2.5.
/// Only reachable when signed in (RootView gates the tab), but renders a defensive
/// signed-out fallback anyway.
struct FavoritesScreen: View {
    @Environment(AppStore.self) private var store
    @Environment(AuthManager.self) private var auth

    @State private var showAuthPrompt = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                content
            }
            .navigationTitle("Your Favorites")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    AccountToolbarButton()
                    ThemeToggleButton()
                }
            }
        }
        .sheet(isPresented: $showAuthPrompt) {
            AuthPromptSheet()
        }
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Your Favorite Items")
                    .font(.largeTitle.bold())
                    .foregroundStyle(Theme.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)

                if !auth.isSignedIn {
                    signedOutFallback
                } else if sortedFavorites.isEmpty {
                    Text("You have no favorite items yet.")
                        .font(.body)
                        .foregroundStyle(Theme.textSecondary)
                } else {
                    LazyVStack(spacing: 16) {
                        ForEach(sortedFavorites, id: \.self) { name in
                            FavoriteRow(name: name) {
                                store.toggleFavorite(name)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var signedOutFallback: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Sign in to save your preferences, access your favorites, and more!")
                .font(.body)
                .foregroundStyle(Theme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            Button {
                showAuthPrompt = true
            } label: {
                Text("Sign in with Google")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Theme.primaryForeground)
                    .padding(.vertical, 12)
                    .padding(.horizontal, 20)
                    .background(Theme.primary)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            }
            .buttonStyle(.plain)
        }
    }

    private var sortedFavorites: [String] {
        store.favorites.sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending }
    }
}

// MARK: - Favorite row

/// A favorited item styled like the selected `ItemRowButton` state, with a trailing
/// destructive minus (U+2212). Tapping the row (or the minus) removes the favorite.
private struct FavoriteRow: View {
    let name: String
    let onRemove: () -> Void

    var body: some View {
        Button(action: onRemove) {
            HStack(spacing: 8) {
                Text("\(name) \u{2605}")
                    .font(.body.weight(.medium))
                    .foregroundStyle(Theme.itemSelectedText)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 12)

                Text("\u{2212}")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Theme.destructive)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.itemSelected)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius)
                    .stroke(Theme.primary, lineWidth: 2)
            )
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Remove \(name) from favorites")
    }
}
