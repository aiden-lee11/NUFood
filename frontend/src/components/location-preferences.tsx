import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { MapPin } from "lucide-react"

interface LocationPreferencesProps {
  locations: string[]
  visibleLocations: string[]
  toggleLocation: (location: string) => void
  setVisibleLocations: (locations: string[]) => void
}

export function LocationPreferences({
  locations,
  visibleLocations,
  toggleLocation,
  setVisibleLocations,
}: LocationPreferencesProps) {
  const selectNorth = () => setVisibleLocations(["Sargent", "Elder"])
  const selectSouth = () => setVisibleLocations(["Allison", "Plex East", "Plex West"])
  const selectNone = () => setVisibleLocations([])

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <Button variant="secondary" size="sm" onClick={selectNorth}>
            <MapPin className="mr-2 h-4 w-4" />
            North Campus
          </Button>
          <Button variant="secondary" size="sm" onClick={selectSouth}>
            <MapPin className="mr-2 h-4 w-4" />
            South Campus
          </Button>
          <Button variant="secondary" size="sm" onClick={selectNone}>
            Clear Locations
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {locations.map((location) => (
            <div key={location} className="flex items-center space-x-2">
              <Checkbox
                id={location}
                checked={visibleLocations.includes(location)}
                onCheckedChange={() => toggleLocation(location)}
              />
              <Label
                htmlFor={location}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 w-full"
              >
                {location}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

