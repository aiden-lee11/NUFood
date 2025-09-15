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
  setDailyItems?: (items: any) => void
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({ selectedDate, setSelectedDate, setDailyItems, minDate: minDateProp, maxDate: maxDateProp }: DatePickerProps) {
  const staticData = useDataStore((state) => state.UserDataResponse)
  const weeklyItems = staticData.weeklyItems
  const [isOpen, setIsOpen] = useState(false)

  function toLocalISODate(d: Date) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function onSubmit(date: Date | undefined) {
    if (date) {
      setSelectedDate(date);
      if (setDailyItems && weeklyItems) {
        setDailyItems(weeklyItems[toLocalISODate(date)]);
      }
      setIsOpen(false);
    }
  }

  // Determine valid range (inclusive), using local dates to avoid TZ off-by-one
  let minDate = minDateProp
  let maxDate = maxDateProp
  if (!minDateProp || !maxDateProp) {
    const keys = Object.keys(weeklyItems || {})
      .filter(Boolean)
      .sort() // YYYY-MM-DD sorts lexicographically

    const parseLocal = (s: string) => {
      const [y, m, d] = s.split('-').map((n) => parseInt(n, 10))
      return new Date(y, m - 1, d)
    }

    if (keys.length >= 1) {
      // Default behavior: center window of +/- 3 days around the midpoint index
      const currentDayIndex = Math.floor(keys.length / 2)
      const baseDate = parseLocal(keys[currentDayIndex])
      minDate = subDays(baseDate, currentDayIndex)
      maxDate = addDays(baseDate, currentDayIndex) // inclusive end
    } else {
      const today = new Date()
      minDate = subDays(today, 3)
      maxDate = addDays(today, 3)
    }
  }

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
          disabled={(date) => !isWithinInterval(date, { start: minDate as Date, end: maxDate as Date })}
          initialFocus
          fromDate={minDate}
          toDate={maxDate}
        />
      </PopoverContent>
    </Popover>
  )
}
