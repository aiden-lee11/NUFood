import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useDataStore } from "@/store"
import { useDietaryProfile } from "@/hooks/useDietaryProfile"
import { ConflictMode } from "@/util/dietaryProfile"
import { DIET_OPTIONS, allergenOptions, tagsEqual } from "@/util/dietaryTags"
import { DailyItem } from "@/types/ItemTypes"

/**
 * A capsule chip: filled violet when selected, muted outline otherwise. Same idiom as
 * the meal chips on the Daily Items page.
 */
const ProfileChip: React.FC<{
  label: string
  selected: boolean
  onClick: () => void
}> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      selected
        ? "bg-primary text-primary-foreground"
        : "border border-border bg-card text-card-foreground hover:bg-item-hover",
    )}
  >
    {label}
  </button>
)

/**
 * Diet chips (Vegetarian / Vegan / Gluten-free). Selecting one keeps only items tagged
 * with it — persisted locally, so it survives reloads until it is turned back off.
 * Mirrors the iOS Display Settings "Diet" section.
 */
export function DietPreferences() {
  const selectedDiets = useDietaryProfile((state) => state.profile.selectedDiets)
  const toggleDiet = useDietaryProfile((state) => state.toggleDiet)

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap gap-2">
          {DIET_OPTIONS.map((option) => (
            <ProfileChip
              key={option.key}
              label={option.label}
              selected={selectedDiets.some((diet) => tagsEqual(diet, option.key))}
              onClick={() => toggleDiet(option.key)}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Persists until you turn it off.</p>
      </CardContent>
    </Card>
  )
}

/**
 * Allergen chips plus the two rules that decide what happens to a matching item: whether
 * a traced ("may contain") tag counts, and whether the item is hidden or badged.
 *
 * The chip list is the common allergen set union-ed with anything else the currently
 * loaded menu tags — so a hall-specific tag is still selectable without a code change.
 */
export function AllergenPreferences() {
  const weeklyItems = useDataStore((state) => state.UserDataResponse.weeklyItems)
  const avoidedAllergens = useDietaryProfile((state) => state.profile.avoidedAllergens)
  const mayContainUnsafe = useDietaryProfile((state) => state.profile.mayContainUnsafe)
  const conflictMode = useDietaryProfile((state) => state.profile.conflictMode)
  const toggleAllergen = useDietaryProfile((state) => state.toggleAllergen)
  const setMayContainUnsafe = useDietaryProfile((state) => state.setMayContainUnsafe)
  const setConflictMode = useDietaryProfile((state) => state.setConflictMode)

  // Only recomputed when the week's menu changes, and only while the dialog is mounted.
  const options = useMemo(() => {
    const loaded = Object.values(weeklyItems ?? {}).flat() as DailyItem[]
    return allergenOptions(loaded)
  }, [weeklyItems])

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <p className="text-xs text-muted-foreground">
          Applies every day. Tag data comes from the dining hall — absence of a tag doesn't
          guarantee allergen-free.
        </p>

        <div className="flex flex-wrap gap-2">
          {options.map((allergen) => (
            <ProfileChip
              key={allergen}
              label={allergen}
              selected={avoidedAllergens.some((entry) => tagsEqual(entry, allergen))}
              onClick={() => toggleAllergen(allergen)}
            />
          ))}
        </div>

        <div className="flex items-start justify-between gap-4 pt-1">
          <div className="space-y-0.5">
            <Label htmlFor="mayContainUnsafe" className="text-sm font-medium leading-none">
              Treat “may contain” as unsafe
            </Label>
            <p className="text-xs text-muted-foreground">Items traced with * count as containing it</p>
          </div>
          <Switch
            id="mayContainUnsafe"
            checked={mayContainUnsafe}
            onCheckedChange={setMayContainUnsafe}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium leading-none">When an item has my allergen</Label>
          <div className="inline-flex rounded-full bg-muted p-1">
            {(
              [
                { mode: "hide", label: "Hide it" },
                { mode: "warn", label: "Show a warning" },
              ] as { mode: ConflictMode; label: string }[]
            ).map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setConflictMode(mode)}
                aria-pressed={conflictMode === mode}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  conflictMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
