import SwiftUI

/// "Set Nutrition Goals" sheet (SPEC §2.4.4). Four numeric fields; empty saves as 0.
/// Saving routes through `store.setNutritionGoals` (persists locally, syncs when signed in).
struct NutritionGoalsSheet: View {
    let current: NutritionGoals
    let onSave: (NutritionGoals) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var calories: String
    @State private var protein: String
    @State private var carbs: String
    @State private var fat: String

    init(current: NutritionGoals, onSave: @escaping (NutritionGoals) -> Void) {
        self.current = current
        self.onSave = onSave
        _calories = State(initialValue: Self.format(current.calories))
        _protein = State(initialValue: Self.format(current.protein))
        _carbs = State(initialValue: Self.format(current.carbs))
        _fat = State(initialValue: Self.format(current.fat))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Set your daily nutrition goals to track your progress")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)

                    field(label: "Daily Calories", text: $calories)
                    field(label: "Protein (g)", text: $protein)
                    field(label: "Carbs (g)", text: $carbs)
                    field(label: "Fat (g)", text: $fat)
                }
                .padding(20)
            }
            .background(Theme.background)
            .navigationTitle("Set Nutrition Goals")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.textSecondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save Goals") { save() }
                        .fontWeight(.semibold)
                        .foregroundStyle(Theme.primary)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func field(label: String, text: Binding<String>) -> some View {
        PlannerLabeledField(label: label) {
            TextField("0", text: text)
                .keyboardType(.numberPad)
                .foregroundStyle(Theme.textPrimary)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.radius)
                        .stroke(Theme.border, lineWidth: 1)
                )
        }
    }

    private func save() {
        let goals = NutritionGoals(
            calories: parse(calories),
            protein: parse(protein),
            carbs: parse(carbs),
            fat: parse(fat)
        )
        onSave(goals)
        dismiss()
    }

    /// Empty → 0; clamps negatives to 0 (min 0 per SPEC §2.4.4).
    private func parse(_ text: String) -> Double {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, let value = Double(trimmed) else { return 0 }
        return max(0, value)
    }

    private static func format(_ value: Double) -> String {
        String(format: "%.0f", value)
    }
}
