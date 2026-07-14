import SwiftUI

/// Your Favorites (`/preferences`) — list & manage favorited item names. SPEC §2.5.
/// Only reachable when signed in (RootView gates the tab), but renders a defensive
/// signed-out fallback anyway.
///
/// Native-iOS management UX:
///   - swipe a row left for a single destructive "Remove"
///   - Edit enters multi-select; "Remove Selected (n)" batches through a
///     confirmation dialog and one `AppStore.removeFavorites` call.
struct FavoritesScreen: View {
    @Environment(AppStore.self) private var store
    @Environment(AuthManager.self) private var auth

    @State private var showAuthPrompt = false
    @State private var editMode: EditMode = .inactive
    @State private var selection: Set<String> = []
    @State private var showRemoveConfirmation = false

    var body: some View {
        NavigationStack {
            Group {
                if !auth.isSignedIn {
                    signedOutContent
                } else if sortedFavorites.isEmpty {
                    emptyState
                } else {
                    favoritesList
                }
            }
            .background(Theme.background)
            .navigationTitle("Your Favorites")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if auth.isSignedIn && !sortedFavorites.isEmpty {
                    ToolbarItem(placement: .topBarLeading) {
                        Button(editMode.isEditing ? "Done" : "Edit") {
                            withAnimation {
                                editMode = editMode.isEditing ? .inactive : .active
                                selection.removeAll()
                            }
                        }
                        .fontWeight(editMode.isEditing ? .semibold : .regular)
                    }
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    ThemeToggleButton()
                    AccountToolbarButton()
                }
            }
            .environment(\.editMode, $editMode)
        }
        .sheet(isPresented: $showAuthPrompt) {
            AuthPromptSheet()
        }
    }

    // MARK: - Favorites list

    private var favoritesList: some View {
        List(selection: $selection) {
            Section {
                ForEach(sortedFavorites, id: \.self) { name in
                    FavoriteRow(name: name)
                        .listRowBackground(Theme.card)
                        .listRowSeparatorTint(Theme.border)
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) {
                                remove([name])
                            } label: {
                                Label("Remove", systemImage: "star.slash")
                            }
                            .tint(Theme.destructive)
                            .accessibilityLabel("Remove \(name) from favorites")
                        }
                        .tag(name)
                }
            } header: {
                header
                    .textCase(nil)
                    .padding(.bottom, 8)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .safeAreaInset(edge: .bottom) {
            if editMode.isEditing {
                removeSelectedBar
            }
        }
        .confirmationDialog(
            "Remove \(selection.count) favorite\(selection.count == 1 ? "" : "s")?",
            isPresented: $showRemoveConfirmation,
            titleVisibility: .visible
        ) {
            Button("Remove", role: .destructive) {
                remove(selection)
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    /// Fixed action bar shown while editing: batch-remove the current selection.
    private var removeSelectedBar: some View {
        Button {
            showRemoveConfirmation = true
        } label: {
            Text("Remove Selected (\(selection.count))")
                .font(.body.weight(.semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    Theme.destructive.opacity(selection.isEmpty ? 0.4 : 1),
                    in: RoundedRectangle(cornerRadius: Theme.radius)
                )
        }
        .disabled(selection.isEmpty)
        .accessibilityLabel("Remove \(selection.count) selected favorites")
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Theme.background)
        .overlay(alignment: .top) {
            Divider().overlay(Theme.border)
        }
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
        VStack(spacing: 12) {
            Image(systemName: "star.slash")
                .font(.system(size: 44))
                .foregroundStyle(Theme.textSecondary)
            Text("No favorites yet")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)
            Text("Star items in All Items to see them here")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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

    // MARK: - Data / actions

    private var sortedFavorites: [String] {
        store.favorites.sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending }
    }

    private var countText: String {
        let count = sortedFavorites.count
        return count == 1 ? "1 item" : "\(count) items"
    }

    private func remove(_ names: Set<String>) {
        withAnimation {
            store.removeFavorites(names)
            selection.subtract(names)
            if store.favorites.isEmpty {
                editMode = .inactive
            }
        }
    }
}

// MARK: - Favorite row

/// One favorite: leading filled star in the app accent, plain name — selection
/// circles (edit mode) and the swipe action carry all management affordances.
private struct FavoriteRow: View {
    let name: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "star.fill")
                .font(.subheadline)
                .foregroundStyle(Theme.primary)
            Text(name)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Theme.textPrimary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
