import SwiftUI

/// All Items (`/all`) — browse & favorite the full catalog of item names, paginated.
/// SPEC §2.2. Signed-out taps present the "Not Signed In" auth prompt.
struct AllItemsScreen: View {
    @Environment(AppStore.self) private var store
    @Environment(AuthManager.self) private var auth

    @State private var searchText = ""
    @State private var currentPage = 1
    @State private var showAuthPrompt = false

    private static let pageSize = 100
    private static let topAnchor = "all-items-top"

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
        let totalPages = max(1, Int((Double(filtered.count) / Double(Self.pageSize)).rounded(.up)))
        let page = min(currentPage, totalPages)
        let pageItems = pageSlice(of: filtered, page: page)

        return ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    Color.clear
                        .frame(height: 0)
                        .id(Self.topAnchor)

                    Text("Select Your Favorite Items")
                        .font(.largeTitle.bold())
                        .foregroundStyle(Theme.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)

                    if totalPages > 1 {
                        pagination(page: page, totalPages: totalPages, proxy: proxy)
                    }

                    searchField

                    ForEach(Array(pageItems.enumerated()), id: \.offset) { _, name in
                        ItemRowButton(name: name, isFavorite: store.favorites.contains(name)) {
                            handleTap(name)
                        }
                    }

                    if totalPages > 1 {
                        pagination(page: page, totalPages: totalPages, proxy: proxy)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .onChange(of: searchText) {
            currentPage = 1
        }
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

    private func pagination(page: Int, totalPages: Int, proxy: ScrollViewProxy) -> some View {
        PaginationControls(currentPage: page, totalPages: totalPages) { newPage in
            currentPage = newPage
            withAnimation(.easeInOut(duration: 0.25)) {
                proxy.scrollTo(Self.topAnchor, anchor: .top)
            }
        }
    }

    private func handleTap(_ name: String) {
        if auth.isSignedIn {
            store.toggleFavorite(name)
        } else {
            showAuthPrompt = true
        }
    }

    // MARK: - Filtering & pagination (case-insensitive token match, in place of Fuse.js)

    private var filteredItems: [String] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return store.allItems }
        let tokens = query.split(separator: " ").map(String.init)
        return store.allItems.filter { name in
            let lower = name.lowercased()
            return tokens.allSatisfy { lower.contains($0) }
        }
    }

    private func pageSlice(of items: [String], page: Int) -> [String] {
        let start = (page - 1) * Self.pageSize
        guard start < items.count else { return [] }
        let end = min(start + Self.pageSize, items.count)
        return Array(items[start..<end])
    }
}

// MARK: - Mobile-style pagination controls (SPEC §2.2)

/// [< Prev]  "Page X of Y"  [Next >] — disabled at the ends. Rendered above and
/// below the list when there is more than one page.
private struct PaginationControls: View {
    let currentPage: Int
    let totalPages: Int
    let onSelect: (Int) -> Void

    var body: some View {
        HStack(spacing: 8) {
            pagerButton(title: "Prev", systemImage: "chevron.left", leading: true,
                        disabled: currentPage <= 1) {
                onSelect(currentPage - 1)
            }

            Spacer(minLength: 8)

            Text("Page \(currentPage) of \(totalPages)")
                .font(.body.weight(.medium))
                .foregroundStyle(Theme.textPrimary)
                .lineLimit(1)

            Spacer(minLength: 8)

            pagerButton(title: "Next", systemImage: "chevron.right", leading: false,
                        disabled: currentPage >= totalPages) {
                onSelect(currentPage + 1)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func pagerButton(title: String, systemImage: String, leading: Bool,
                             disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if leading { Image(systemName: systemImage) }
                Text(title)
                if !leading { Image(systemName: systemImage) }
            }
            .font(.body.weight(.medium))
            .foregroundStyle(disabled ? Theme.textSecondary : Theme.textPrimary)
            .padding(.vertical, 10)
            .padding(.horizontal, 16)
            .background(Theme.card)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            .opacity(disabled ? 0.5 : 1)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }
}
