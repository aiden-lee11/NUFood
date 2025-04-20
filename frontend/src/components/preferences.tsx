import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings } from "lucide-react"
import { LocationPreferences } from "./location-preferences"
import { TimePreferences } from "./time-preferences"
import { VisualPreferences } from "./visual-preferences"

interface PreferencesProps {
  showPreferences: boolean
  state: {
    locations: string[]
    visibleLocations: string[]
    timesOfDay: string[]
    visibleTimes: string[]
    expandFolders: boolean
  }
  actions: {
    setShowPreferences: (show: boolean) => void
    togglePreferencesItem: (type: string, item: any) => void
    setVisibleLocations: (locations: string[]) => void
  }
}

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

          <Tabs defaultValue="locations" className="w-full" >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="times">Times</TabsTrigger>
              <TabsTrigger value="visual">Visual</TabsTrigger>
            </TabsList>

            <TabsContent
              value="locations"
              className="
              mt-4
              focus:outline-none 
              focus-visible:outline-none
              focus-visible:ring-0 
              focus-visible:ring-offset-0
              "
            >
              <LocationPreferences
                locations={state.locations}
                visibleLocations={state.visibleLocations}
                toggleLocation={(location) => actions.togglePreferencesItem("location", location)}
                setVisibleLocations={actions.setVisibleLocations}
              />
            </TabsContent>

            <TabsContent value="times" className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
              <TimePreferences
                timesOfDay={state.timesOfDay}
                visibleTimes={state.visibleTimes}
                toggleTime={(time) => actions.togglePreferencesItem("time", time)}
              />
            </TabsContent>

            <TabsContent value="visual" className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
              <VisualPreferences
                expandFolders={state.expandFolders}
                toggleExpandFolders={() => actions.togglePreferencesItem("expandFolders", !state.expandFolders)}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PreferencesDialog
