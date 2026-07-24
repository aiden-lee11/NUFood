import { format } from "date-fns"
import PreferencesDialog from "./preferences"
import { DatePicker } from "@/components/calendar"

interface HeaderControlsProps {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  setDailyItems: (items: any) => void
  showPreferences: boolean
  preferencesState: {
    locations: string[]
    visibleLocations: string[]
    timesOfDay: string[]
    visibleTimes: string[]
    expandFolders: boolean
    showNutrition: boolean
  }
  preferencesActions: {
    togglePreferencesItem: (type: string, item: any) => void
    setVisibleLocations: (locations: string[]) => void
    setShowPreferences: (show: boolean) => void
  }
}

export function HeaderControls({
  selectedDate,
  setSelectedDate,
  setDailyItems,
  showPreferences,
  preferencesState,
  preferencesActions,
}: HeaderControlsProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Daily Items for {format(selectedDate, "PP")}
      </h1>

      <div className="flex items-center gap-3">
        <PreferencesDialog showPreferences={showPreferences} state={preferencesState} actions={preferencesActions} />

        <DatePicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} setDailyItems={setDailyItems} />
      </div>
    </div>
  )
}

