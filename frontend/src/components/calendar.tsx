import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useDataStore } from "@/store"
import { format, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"

interface DatePickerProps {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  setDailyItems: (items: any) => void
}

export function DatePicker({
  selectedDate,
  setSelectedDate,
  setDailyItems,
}: DatePickerProps) {
  const staticData = useDataStore((s) => s.UserDataResponse)
  const weeklyItems = staticData.weeklyItems
  const [isOpen, setIsOpen] = useState(false)

  // Turn a JS Date into "yyyy-MM-dd" in local time
  function keyFor(date: Date) {
    return format(date, "yyyy-MM-dd")
  }

  function onSubmit(date: Date | undefined) {
    if (date) {
      setSelectedDate(date)
      setDailyItems(weeklyItems[keyFor(date)] || [])
      setIsOpen(false)
    }
  }

  const availableDates = Object.keys(weeklyItems).sort()

  // Parse the very first and last keys into true local-midnight Dates
  const baseDate =
    availableDates.length > 0
      ? parseISO(availableDates[0])
      : new Date()
  const lastDate =
    availableDates.length > 0
      ? parseISO(availableDates[availableDates.length - 1])
      : new Date()

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "mb-2 h-9 px-3",
            !selectedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {selectedDate ? format(selectedDate, "PP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSubmit}
          // disables every day not in your weeklyItems map
          disabled={(date) => !availableDates.includes(keyFor(date))}
          initialFocus
          fromDate={baseDate}
          toDate={lastDate}
        />
      </PopoverContent>
    </Popover>
  )
}
