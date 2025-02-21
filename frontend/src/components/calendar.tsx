import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDataStore } from "@/store"
import { DailyItem } from "@/types/ItemTypes"

interface DatePickerProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  setDailyItems: (dailyItems: DailyItem[]) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, setSelectedDate, setDailyItems }) => {

  const staticData = useDataStore((state) => state.UserDataResponse);
  const weeklyItems = staticData.weeklyItems;

  function onSubmit(date: Date | undefined) {
    if (date !== undefined) {
      setSelectedDate(date);
      setDailyItems(weeklyItems[date.toISOString().split("T")[0]])
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon />
          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSubmit}
          disabled={(date) =>
            date.getDate() < (new Date().getDate() - 3) || date.getDate() > (new Date().getDate() + 3)
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
