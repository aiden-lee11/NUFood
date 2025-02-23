import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface TimePreferencesProps {
  timesOfDay: string[]
  visibleTimes: string[]
  toggleTime: (time: string) => void
}

export function TimePreferences({ timesOfDay, visibleTimes, toggleTime }: TimePreferencesProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {timesOfDay.map((time) => (
            <div key={time} className="flex items-center space-x-2">
              <Checkbox id={time} checked={visibleTimes.includes(time)} onCheckedChange={() => toggleTime(time)} />
              <Label
                htmlFor={time}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {time}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

