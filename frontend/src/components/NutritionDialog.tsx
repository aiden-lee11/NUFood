import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DailyItem } from "../types/ItemTypes"
import { macroCell } from "../util/nutritionFormat"

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
 */
const NutritionDialog: React.FC<NutritionDialogProps> = ({
  item,
  isFavorite,
  onToggleFavorite,
  onOpenChange,
}) => {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label={item ? `Nutrition info for ${item.Name}` : undefined}
        className="sm:max-w-[420px] gap-4"
      >
        {item && (
          <>
            <DialogHeader className="space-y-1 pr-6">
              <DialogTitle className="text-left text-lg font-bold">{item.Name}</DialogTitle>
              <p className="text-left text-sm text-muted-foreground">
                {item.Location} · {item.StationName} · {item.TimeOfDay}
              </p>
            </DialogHeader>

            <div className="grid grid-cols-4 gap-2">
              <MacroCell label="Cal" value={macroCell(item.calories)} />
              <MacroCell label="Protein" value={macroCell(item.protein, "g")} />
              <MacroCell label="Carbs" value={macroCell(item.carbs, "g")} />
              <MacroCell label="Fat" value={macroCell(item.fat, "g")} />
            </div>

            {item.portion && (
              <p className="text-sm text-muted-foreground">Portion: {item.portion}</p>
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

/** One macro tile: bold value over a muted label, on a bordered card cell. */
const MacroCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col items-center gap-1 rounded-md border border-border bg-card py-3">
    <span className="text-base font-semibold text-card-foreground">{value}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
)

export default NutritionDialog
