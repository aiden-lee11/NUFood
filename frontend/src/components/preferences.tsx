import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { LocationPreferences } from "./location-preferences"
import { VisualPreferences } from "./visual-preferences"

interface PreferencesProps {
  showPreferences: boolean
  state: {
    locations: string[]
    visibleLocations: string[]
    timesOfDay: string[]
    visibleTimes: string[]
    expandFolders: boolean
    showNutrition: boolean
  }
  actions: {
    setShowPreferences: (show: boolean) => void
    togglePreferencesItem: (type: string, item: any) => void
    setVisibleLocations: (locations: string[]) => void
  }
}

// Meal (time) visibility now lives only on the page's meal chips, so this dialog is a
// single panel: the dining-hall visibility grid plus the two visual toggles (expand
// folders, show nutrition). Mirrors iOS `DisplaySettingsSheet`.
const PreferencesDialog: React.FC<PreferencesProps> = ({ showPreferences, state, actions }) => {
  return (
    <>
      <Button onClick={() => actions.setShowPreferences(true)} variant="outline" size="sm" className="mb-2 h-9 px-3">
        <Settings className="h-4 w-4" />
        Display Settings
      </Button >

      <Dialog open={showPreferences} onOpenChange={actions.setShowPreferences}>
        <DialogContent
          className="
          sm:max-w-[600px]
          focus:outline-none
          focus-visible:outline-none
          focus-visible:ring-0
          focus-visible:ring-offset-0
          "
        >
          <DialogHeader>
            <DialogTitle>Display Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Dining Halls
              </h3>
              <LocationPreferences
                locations={state.locations}
                visibleLocations={state.visibleLocations}
                toggleLocation={(location) => actions.togglePreferencesItem("location", location)}
                setVisibleLocations={actions.setVisibleLocations}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Display
              </h3>
              <VisualPreferences
                expandFolders={state.expandFolders}
                toggleExpandFolders={() => actions.togglePreferencesItem("expandFolders", !state.expandFolders)}
                showNutrition={state.showNutrition}
                toggleShowNutrition={() => actions.togglePreferencesItem("showNutrition", !state.showNutrition)}
              />
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PreferencesDialog
