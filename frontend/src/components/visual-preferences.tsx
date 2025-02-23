import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface VisualPreferencesProps {
  expandFolders: boolean
  toggleExpandFolders: () => void
}

export function VisualPreferences({ expandFolders, toggleExpandFolders }: VisualPreferencesProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-2">
          <Checkbox id="expandFolders" checked={expandFolders} onCheckedChange={toggleExpandFolders} />
          <Label
            htmlFor="expandFolders"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Expand All Folders by Default
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}

