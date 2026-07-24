import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface VisualPreferencesProps {
  expandFolders: boolean
  toggleExpandFolders: () => void
  showNutrition: boolean
  toggleShowNutrition: () => void
}

export function VisualPreferences({
  expandFolders,
  toggleExpandFolders,
  showNutrition,
  toggleShowNutrition,
}: VisualPreferencesProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center space-x-2">
          <Checkbox id="expandFolders" checked={expandFolders} onCheckedChange={toggleExpandFolders} />
          <Label
            htmlFor="expandFolders"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 w-full"
          >
            Expand All Folders by Default
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="showNutrition" checked={showNutrition} onCheckedChange={toggleShowNutrition} />
          <Label
            htmlFor="showNutrition"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 w-full"
          >
            Show nutrition
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}
