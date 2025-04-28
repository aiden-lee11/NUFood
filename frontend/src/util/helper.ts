import { LocationOperatingTimes, OperationHoursData, OperatingTime } from "../types/OperationTypes";

// Returns
// -- Breakfast if current time is between 7:00 AM and 10:59 AM
// -- Lunch if current time is between 11:00 AM and 4:59 PM
// -- Dinner if current time is between 5:00 PM and 7:59 PM
// -- Empty string if current time is outside of the above ranges
export const getCurrentTimeOfDay = (): string => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  if (currentHour >= 7 && currentHour <= 10) {
    return "Breakfast";
  } else if (currentHour >= 11 && currentHour <= 16) {
    return "Lunch";
  } else if (currentHour >= 17 && currentHour <= 22) {
    return "Dinner";
  }
  return "";
};

export const getWeekday = (dateNum: number): string => {
  switch (dateNum) {
    case 0:
      return "Sunday"
    case 1:
      return "Monday"
    case 2:
      return "Tuesday"
    case 3:
      return "Wednesday"
    case 4:
      return "Thursday"
    case 5:
      return "Friday"
    case 6:
      return "Saturday"
    default:
      return "How did you get here?"
  }
}

// 4/28/2025 encountered Plex West as "Foster Walker Plex West" instead of "Foster Walker Plex West & Market"
// To avoid breaking the app, we will add an alias for it and iterate over which one we find
const locationAliases: Record<string, string[]> = {
  Elder: ["Elder Dining Commons"],
  Sargent: ["Sargent Dining Commons"],
  Allison: ["Allison Dining Commons"],
  "Plex East": ["Foster Walker Plex East"],
  "Plex West": [
    "Foster Walker Plex West & Market",
    "Foster Walker Plex West",
  ],
};

// Take in the data and return a mapping of location to operation times
export function getDailyLocationOperationTimes(
  data: OperationHoursData[],
  date: Date
): LocationOperatingTimes {
  const currentDay = date.getDay();
  const res: LocationOperatingTimes = {};

  for (const [shortName, aliases] of Object.entries(locationAliases)) {
    // find the *first* matching alias
    const loc = data.find(d => aliases.includes(d.Name));
    if (!loc) {
      console.warn(`No data for any of: ${aliases.join(", ")}`);
      res[shortName] = null;
      continue;
    }

    const dayInfo = loc.Week[currentDay];
    res[shortName] =
      dayInfo.Status === "closed" || !dayInfo.Hours
        ? null
        : dayInfo.Hours;
  }

  return res;
}


export const formatTime = (hour: string, minutes: string): string => {
  const hourInt = parseInt(hour, 10);
  const minutesInt = parseInt(minutes, 10);

  // Determine AM/PM
  const period = hourInt >= 12 ? "p" : "a";
  const formattedHour = hourInt > 12 ? hourInt - 12 : hourInt === 0 ? 12 : hourInt;

  // Format the time as "hh:mm"
  const formattedTime = `${formattedHour}:${minutesInt.toString().padStart(2, "0")}${period}`;

  return formattedTime;
};


export const isLocationOpenNow = (operatingTimes: OperatingTime[] | null): boolean => {
  // No data so we assume it's closed
  if (!operatingTimes) {
    return false;
  }

  const now = new Date();
  return operatingTimes.some(({ StartHour, StartMinutes, EndHour, EndMinutes }) => {
    const start = new Date();
    const end = new Date();
    start.setHours(parseInt(StartHour, 10), parseInt(StartMinutes, 10), 0);
    end.setHours(parseInt(EndHour, 10), parseInt(EndMinutes, 10), 0);
    return now >= start && now < end;
  });
};

export const getCurrentTimeOfDayWithLocations = (
  locationOperationHours: LocationOperatingTimes
): { timeOfDay: string; openLocations: string[] } => {
  const timeOfDay = getCurrentTimeOfDay();

  const openLocations = Object.entries(locationOperationHours)
    .filter(([_, operatingTimes]) => isLocationOpenNow(operatingTimes))
    .map(([location]) => location);

  return { timeOfDay, openLocations };
};

