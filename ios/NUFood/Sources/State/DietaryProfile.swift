import Foundation

// MARK: - Tag semantics

/// Meaning of the raw `filters` strings the dining halls attach to each item.
///
/// Three kinds of tag share one flat list:
///   * **Diets** — "Vegetarian", "Vegan", "Avoiding Gluten" (shown as "Gluten-free").
///   * **Marketing callouts** — "Good Source of Protein", "How Good Friendly".
///     Displayed in the detail sheet, never filterable.
///   * **Allergens** — everything else. A trailing `*` ("Sesame*") means the item is
///     only *traced* with it ("may contain") rather than containing it outright.
///
/// All matching is case-insensitive: the scraper's casing is not guaranteed.
enum DietaryTag {
    /// Canonical diet tag names, in the order the Display Settings chips show them.
    static let diets: [String] = ["Vegetarian", "Vegan", "Avoiding Gluten"]

    /// Row mini-tag priority: the single diet worth showing when an item has several.
    static let dietDisplayPriority: [String] = ["Vegan", "Vegetarian", "Avoiding Gluten"]

    /// Nutrition/marketing callouts — display-only, deliberately not filterable.
    static let marketing: [String] = ["Good Source of Protein", "How Good Friendly"]

    /// Allergen chips always offered in Display Settings, in display order. The sheet
    /// unions these with whatever other allergen tags the loaded menu carries, so new
    /// upstream tags surface without a release.
    static let commonAllergens: [String] = [
        "Milk", "Egg", "Wheat", "Gluten", "Soy", "Sesame", "Peanut", "Tree Nut",
        "Fish", "Shellfish", "Mustard", "Celery", "Sulphites", "Garlic", "Onion",
        "Tomato", "Beef", "Pork", "Poultry", "MSG"
    ]

    /// UI label for a diet tag — "Avoiding Gluten" is dining-hall speak for gluten-free.
    static func label(for diet: String) -> String {
        matches(diet, "Avoiding Gluten") ? "Gluten-free" : diet
    }

    /// Trailing `*` = traced, i.e. "may contain" rather than "contains".
    static func isMayContain(_ tag: String) -> Bool {
        tag.trimmingCharacters(in: .whitespaces).hasSuffix("*")
    }

    /// The tag name with its may-contain marker and padding removed.
    static func name(_ tag: String) -> String {
        tag.trimmingCharacters(in: .whitespaces)
            .trimmingCharacters(in: CharacterSet(charactersIn: "*"))
            .trimmingCharacters(in: .whitespaces)
    }

    static func isDiet(_ tag: String) -> Bool {
        diets.contains { matches($0, name(tag)) }
    }

    static func isMarketing(_ tag: String) -> Bool {
        marketing.contains { matches($0, name(tag)) }
    }

    /// Anything that isn't a diet or a marketing callout is treated as an allergen.
    static func isAllergen(_ tag: String) -> Bool {
        let name = name(tag)
        return !name.isEmpty && !isDiet(tag) && !isMarketing(tag)
    }

    /// Allergen names in a stable, human order: the fixed list first (in its own
    /// order), then anything new from the menu data, alphabetically.
    static func ordered(_ allergens: some Collection<String>) -> [String] {
        let known = commonAllergens.filter { common in allergens.contains { matches($0, common) } }
        let extra = allergens
            .filter { value in !commonAllergens.contains { matches($0, value) } }
            .sorted()
        return known + extra
    }

    static func matches(_ lhs: String, _ rhs: String) -> Bool {
        lhs.caseInsensitiveCompare(rhs) == .orderedSame
    }
}

// MARK: - Per-item tag reads

extension DailyItem {
    /// Diet tags this item carries, in canonical order.
    var dietTags: [String] {
        DietaryTag.diets.filter { hasDiet($0) }
    }

    /// The one diet label worth putting on a list row (Vegan > Vegetarian > Gluten-free).
    var primaryDietLabel: String? {
        DietaryTag.dietDisplayPriority.first(where: { hasDiet($0) }).map(DietaryTag.label(for:))
    }

    func hasDiet(_ diet: String) -> Bool {
        filters.contains { DietaryTag.matches(DietaryTag.name($0), diet) }
    }

    /// Display-only callouts ("Good Source of Protein").
    var marketingTags: [String] {
        DietaryTag.marketing.filter { tag in filters.contains { DietaryTag.matches(DietaryTag.name($0), tag) } }
    }

    /// Allergens the item contains outright.
    var containsAllergens: [String] {
        allergenNames(mayContain: false)
    }

    /// Allergens the item is only traced with (`*`).
    var mayContainAllergens: [String] {
        allergenNames(mayContain: true)
    }

    private func allergenNames(mayContain: Bool) -> [String] {
        var seen = Set<String>()
        return filters.compactMap { tag in
            guard DietaryTag.isAllergen(tag), DietaryTag.isMayContain(tag) == mayContain else { return nil }
            let name = DietaryTag.name(tag)
            return seen.insert(name.lowercased()).inserted ? name : nil
        }
    }

    /// Ingredient list with the scraper's footnote markers ("SUGAR^", "SOY*") stripped.
    var displayIngredients: String {
        let cleaned = ingredients
            .split(separator: ",")
            .map {
                $0.trimmingCharacters(in: .whitespacesAndNewlines)
                    .trimmingCharacters(in: CharacterSet(charactersIn: "^*"))
                    .trimmingCharacters(in: .whitespacesAndNewlines)
            }
            .filter { !$0.isEmpty }
        return cleaned.joined(separator: ", ")
    }
}

// MARK: - Profile

/// The user's standing dietary profile: diets to require and allergens to avoid.
///
/// Device-local by design — like `expandFolders`, it lives in `@AppStorage` and is
/// never synced to the backend (display prefs only ever sync `visibleLocations`).
/// Every surface reads it by declaring the four `@AppStorage` keys below and calling
/// `DietaryProfile(dietsRaw:…)`; sets are stored as `|`-joined strings so the whole
/// profile is four plain UserDefaults values.
struct DietaryProfile: Equatable {
    /// What to do with an item that carries an avoided allergen.
    enum ConflictMode: String {
        case hide
        case warn
    }

    var selectedDiets: Set<String> = []
    var avoidedAllergens: Set<String> = []
    /// Treat traced (`*`) allergens as if the item contained them.
    var mayContainUnsafe: Bool = true
    var conflictMode: ConflictMode = .hide

    // MARK: Storage

    enum Key {
        static let diets = "dietaryDiets"
        static let allergens = "dietaryAllergens"
        static let mayContainUnsafe = "dietaryMayContainUnsafe"
        static let conflictMode = "dietaryConflictMode"
    }

    static func encode(_ values: Set<String>) -> String {
        values.sorted().joined(separator: "|")
    }

    static func decode(_ raw: String) -> Set<String> {
        Set(raw.split(separator: "|")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty })
    }

    init(dietsRaw: String, allergensRaw: String, mayContainUnsafe: Bool, conflictModeRaw: String) {
        selectedDiets = Self.decode(dietsRaw)
        avoidedAllergens = Self.decode(allergensRaw)
        self.mayContainUnsafe = mayContainUnsafe
        conflictMode = ConflictMode(rawValue: conflictModeRaw) ?? .hide
    }

    init() {}

    // MARK: Evaluation

    var isActive: Bool { !selectedDiets.isEmpty || !avoidedAllergens.isEmpty }

    /// An item passes only when it carries EVERY selected diet tag.
    func matchesDiets(_ item: DailyItem) -> Bool {
        selectedDiets.allSatisfy { item.hasDiet($0) }
    }

    /// A profile allergen found on an item.
    struct AllergenHit: Equatable {
        let allergen: String
        let isMayContain: Bool

        /// Row-badge text: "contains sesame" / "may contain sesame".
        var label: String {
            (isMayContain ? "may contain " : "contains ") + allergen.lowercased()
        }
    }

    /// The first avoided allergen this item carries, contains-tags taking priority
    /// over traced ones. `nil` when the item is clear (or carries no tag data).
    func allergenHit(for item: DailyItem) -> AllergenHit? {
        guard !avoidedAllergens.isEmpty else { return nil }
        if let name = item.containsAllergens.first(where: avoids) {
            return AllergenHit(allergen: name, isMayContain: false)
        }
        guard mayContainUnsafe else { return nil }
        if let name = item.mayContainAllergens.first(where: avoids) {
            return AllergenHit(allergen: name, isMayContain: true)
        }
        return nil
    }

    func avoids(_ allergen: String) -> Bool {
        avoidedAllergens.contains { DietaryTag.matches($0, allergen) }
    }

    /// Status-pill text for the active halves: "Vegan · sesame, peanut".
    /// Either half is omitted when unused.
    var summary: String {
        var parts = DietaryTag.diets
            .filter { diet in selectedDiets.contains { DietaryTag.matches($0, diet) } }
            .map(DietaryTag.label(for:))
        if !avoidedAllergens.isEmpty {
            parts.append(DietaryTag.ordered(avoidedAllergens)
                .map { $0.lowercased() }
                .joined(separator: ", "))
        }
        return parts.joined(separator: " · ")
    }
}
