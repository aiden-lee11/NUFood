import { useState } from "react"
import { format, addDays, subDays, isWithinInterval } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDataStore } from "@/store"

interface DatePickerProps {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  setDailyItems: (items: any) => void
}

export function DatePicker({ selectedDate, setSelectedDate, setDailyItems }: DatePickerProps) {
  const staticData = useDataStore((state) => state.UserDataResponse)
  const weeklyItems = staticData.weeklyItems
  const [isOpen, setIsOpen] = useState(false)

  function onSubmit(date: Date | undefined) {
    if (date) {
      setSelectedDate(date);
      setDailyItems(weeklyItems[date.toISOString().split("T")[0]]);
      setIsOpen(false);
    }
  }

  const currentDayIndex = Math.floor(Object.keys(weeklyItems).length / 2)
  const baseDate = new Date(Object.keys(weeklyItems)[currentDayIndex])

  const minDate = subDays(baseDate, currentDayIndex)
  const maxDate = addDays(baseDate, currentDayIndex + 1)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("mb-2 h-9 px-3", !selectedDate && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4" />
          {selectedDate ? format(selectedDate, "PP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSubmit}
          disabled={(date) => !isWithinInterval(date, { start: minDate, end: maxDate })}
          initialFocus
          fromDate={minDate}
          toDate={maxDate}
        />
      </PopoverContent>
    </Popover>
  )
}
