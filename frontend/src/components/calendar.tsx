import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useDataStore } from "@/store"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"

interface DatePickerProps {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  setDailyItems: (items: any) => void
}

export function DatePicker({ selectedDate, setSelectedDate, setDailyItems }: DatePickerProps) {
  const staticData = useDataStore((state) => state.UserDataResponse)
  const fetchWeeklyData = useDataStore((state) => state.fetchWeeklyData)
  const weeklyItems = staticData.weeklyItems
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && Object.keys(weeklyItems).length <= 1) {
      await fetchWeeklyData();
    }
  };

  function onSubmit(date: Date | undefined) {
    if (date) {
      setSelectedDate(date);
      const dateKey = date.toISOString().slice(0, 10);
      setDailyItems(weeklyItems[dateKey] || []);
      setIsOpen(false);
    }
  }

  // Only calculate these if we have weekly items
  const availableDates = Object.keys(weeklyItems).sort();
  const baseDate = availableDates.length > 0 ? new Date(availableDates[0]) : new Date();
  const lastDate = availableDates.length > 0 ? new Date(availableDates[availableDates.length - 1]) : new Date();

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
          disabled={(date) => {
            const dateStr = date.toISOString().slice(0, 10);
            return !availableDates.includes(dateStr);
          }}
          initialFocus
          fromDate={baseDate}
          toDate={lastDate}
        />
      </PopoverContent>
    </Popover>
  )
}
