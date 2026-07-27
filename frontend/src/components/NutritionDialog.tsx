import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DailyItem } from "../types/ItemTypes"
import { macroCell } from "../util/nutritionFormat"
import { useDietaryProfile } from "../hooks/useDietaryProfile"
import { DietOption, formatIngredients, parseTags, tagsEqual } from "../util/dietaryTags"

interface NutritionDialogProps {
  item: DailyItem | null
  isFavorite: boolean
  onToggleFavorite: (item: DailyItem) => void
  onOpenChange: (open: boolean) => void
}

/**
 * Compact nutrition detail dialog reached by a row's ⓘ button — the web mirror of
 * iOS `NutritionDetailSheet` (SPEC §3.7). Shows the item name, a "Hall · Station · Meal"
 * context line, a four-cell macro grid, an optional portion, and a full-width favorite
 * toggle driven by the same store action the row uses.
 *
 * Everything tag-derived below (diet/marketing capsules, contains / may-contain chips,
 * ingredients) renders only when the hall actually sent that data — production sends
 * none of it yet, so the dialog must look exactly as it did before in that case.
 */
const NutritionDialog: React.FC<NutritionDialogProps> = ({
  item,
  isFavorite,
  onToggleFavorite,
  onOpenChange,
}) => {
  const avoidedAllergens = useDietaryProfile((state) => state.profile.avoidedAllergens)
  const selectedDiets = useDietaryProfile((state) => state.profile.selectedDiets)
  const addDiet = useDietaryProfile((state) => state.addDiet)

  // A diet capsule is a shortcut into the profile, so it asks first.
  const [pendingDiet, setPendingDiet] = useState<DietOption | null>(null)
  useEffect(() => {
    setPendingDiet(null)
  }, [item])

  const tags = useMemo(() => parseTags(item?.filters), [item])
  const ingredients = useMemo(() => formatIngredients(item?.ingredients), [item])

  const isAvoided = (allergen: string) =>
    avoidedAllergens.some((entry) => tagsEqual(entry, allergen))
  const isSelectedDiet = (diet: DietOption) =>
    selectedDiets.some((entry) => tagsEqual(entry, diet.key))

  const hasCapsules = tags.diets.length > 0 || tags.marketing.length > 0

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label={item ? `Nutrition info for ${item.Name}` : undefined}
        className="sm:max-w-[420px] gap-4 max-h-[85vh] overflow-y-auto"
      >
        {item && (
          <>
            <DialogHeader className="space-y-1 pr-6">
              <DialogTitle className="text-left text-lg font-bold">{item.Name}</DialogTitle>
              <p className="text-left text-sm text-muted-foreground">
                {item.Location} · {item.StationName} · {item.TimeOfDay}
              </p>
            </DialogHeader>

            {/* Only ~a quarter of items carry a description; the rest arrive as "". */}
            {item.Description && (
              <p className="text-sm text-muted-foreground">{item.Description}</p>
            )}

            {hasCapsules && (
              <div className="flex flex-wrap gap-2">
                {tags.diets.map((diet) => {
                  const active = isSelectedDiet(diet)
                  return (
                    <button
                      key={diet.key}
                      type="button"
                      disabled={active}
                      onClick={() => setPendingDiet(diet)}
                      title={active ? "Already in your profile" : `Show only ${diet.label} items`}
                      className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/25 disabled:cursor-default disabled:hover:bg-emerald-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-emerald-300"
                    >
                      {diet.label}
                      {active && " ✓"}
                    </button>
                  )
                })}
                {/* Marketing tags are informational only — never a filter. */}
                {tags.marketing.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {pendingDiet && (
              <div className="space-y-2 rounded-md border border-border bg-muted/50 p-3">
                <p className="text-sm text-foreground">Show only {pendingDiet.label} items?</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      addDiet(pendingDiet.key)
                      setPendingDiet(null)
                    }}
                  >
                    Show only {pendingDiet.label}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPendingDiet(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              <MacroCell label="Cal" value={macroCell(item.calories)} />
              <MacroCell label="Protein" value={macroCell(item.protein, "g")} />
              <MacroCell label="Carbs" value={macroCell(item.carbs, "g")} />
              <MacroCell label="Fat" value={macroCell(item.fat, "g")} />
            </div>

            {item.portion && (
              <p className="text-sm text-muted-foreground">Portion: {item.portion}</p>
            )}

            {tags.contains.length > 0 && (
              <AllergenGroup
                label="Contains"
                allergens={tags.contains}
                isAvoided={isAvoided}
                chipClassName="bg-red-500/10 text-red-700 dark:text-red-300"
              />
            )}

            {tags.mayContain.length > 0 && (
              <AllergenGroup
                label="May contain"
                allergens={tags.mayContain}
                isAvoided={isAvoided}
                chipClassName="bg-amber-500/15 text-amber-700 dark:text-amber-300"
              />
            )}

            {ingredients && (
              <div className="space-y-1.5">
                <SectionLabel>Ingredients</SectionLabel>
                <p className="text-sm text-muted-foreground">{ingredients}</p>
              </div>
            )}

            <Button className="w-full" onClick={() => onToggleFavorite(item)}>
              {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** A small uppercase heading, matching the Display Settings section labels. */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
)

/** One tinted chip row — allergens already on the profile call themselves out. */
const AllergenGroup: React.FC<{
  label: string
  allergens: string[]
  isAvoided: (allergen: string) => boolean
  chipClassName: string
}> = ({ label, allergens, isAvoided, chipClassName }) => (
  <div className="space-y-1.5">
    <SectionLabel>{label}</SectionLabel>
    <div className="flex flex-wrap gap-1.5">
      {allergens.map((allergen) => (
        <span
          key={allergen}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${chipClassName}`}
        >
          {allergen}
          {isAvoided(allergen) && " — in your profile"}
        </span>
      ))}
    </div>
  </div>
)

/** One macro tile: bold value over a muted label, on a bordered card cell. */
const MacroCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col items-center gap-1 rounded-md border border-border bg-card py-3">
    <span className="text-base font-semibold text-card-foreground">{value}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
)

export default NutritionDialog
