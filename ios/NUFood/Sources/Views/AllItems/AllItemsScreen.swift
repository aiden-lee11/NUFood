import SwiftUI

/// All Items (`/all`) — browse & favorite the full catalog of item names.
/// SPEC §2.2. Signed-out taps present the "Not Signed In" auth prompt. The full
/// catalog lives in memory; rows are revealed progressively as the user scrolls.
struct AllItemsScreen: View {
    @Environment(AppStore.self) private var store
    @Environment(AuthManager.self) private var auth

    @State private var searchText = ""
    @State private var visibleCount = batchSize
    @State private var showAuthPrompt = false

    private static let batchSize = 100

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                content
            }
            .navigationTitle("All Items")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    ThemeToggleButton()
                    AccountToolbarButton()
                }
            }
        }
        .sheet(isPresented: $showAuthPrompt) {
            AuthPromptSheet()
        }
    }

    private var content: some View {
        // Compute the filtered catalog once per render (allItems can be ~10k names).
        let filtered = filteredItems
        let visibleItems = filtered.prefix(visibleCount)

        return ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                Text("Select Your Favorite Items")
                    .font(.title.bold())
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                searchField

                ForEach(Array(visibleItems.enumerated()), id: \.offset) { index, name in
                    ItemRowButton(name: name, isFavorite: store.favorites.contains(name)) {
                        handleTap(name)
                    }
                    .onAppear {
                        if index == visibleItems.count - 1 {
                            revealMore(total: filtered.count)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
        }
        .scrollDismissesKeyboard(.interactively)
        .refreshable { await store.refresh() }
        .onChange(of: searchText) {
            visibleCount = Self.batchSize
        }
    }

    private func revealMore(total: Int) {
        guard visibleCount < total else { return }
        visibleCount = min(visibleCount + Self.batchSize, total)
    }

    private var searchField: some View {
        TextField("", text: $searchText, prompt: Text("Search for an item...")
            .foregroundColor(Theme.textSecondary))
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .submitLabel(.search)
            .foregroundStyle(Theme.textPrimary)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(Theme.card)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
    }

    private func handleTap(_ name: String) {
        if auth.isSignedIn {
            store.toggleFavorite(name)
        } else {
            showAuthPrompt = true
        }
    }

    // MARK: - Filtering (case-insensitive token match, in place of Fuse.js)

    private var filteredItems: [String] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return store.allItems }
        let tokens = query.split(separator: " ").map(String.init)
        return store.allItems.filter { name in
            let lower = name.lowercased()
            return tokens.allSatisfy { lower.contains($0) }
        }
    }
}
