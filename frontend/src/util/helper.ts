import { LocationOperatingTimes, OperationHoursData, OperatingTime } from "../types/OperationTypes";

// The backend serves wall-clock hours in America/Chicago, so "now" must be computed in
// Central time regardless of the device timezone. Derive it via Intl.DateTimeFormat parts.
const CENTRAL_TIME_ZONE = "America/Chicago";
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export const getCentralNow = (): {
  hours: number;
  minutes: number;
  weekdayIndex: number;
  dateString: string;
} => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  // hour12:false can emit "24" for midnight in some engines — normalize to 0.
  let hours = parseInt(map.hour, 10);
  if (hours === 24) hours = 0;
  const minutes = parseInt(map.minute, 10);
  const weekdayIndex = WEEKDAY_INDEX[map.weekday] ?? new Date().getDay();
  const dateString = `${map.year}-${map.month}-${map.day}`;

  return { hours, minutes, weekdayIndex, dateString };
};

// Returns
// -- Breakfast if current time is between 7:00 AM and 10:59 AM
// -- Lunch if current time is between 11:00 AM and 4:59 PM
// -- Dinner if current time is between 5:00 PM and 7:59 PM
// -- Empty string if current time is outside of the above ranges
export const getCurrentTimeOfDay = (): string => {
  const { hours: currentHour } = getCentralNow();
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
export const locationAliases: Record<string, string[]> = {
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


export const formatTime = (hour: number, minutes: number): string => {
  // Determine AM/PM
  const period = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

  // Format the time as "hh:mm"
  const formattedTime = `${formattedHour}:${minutes.toString().padStart(2, "0")}${period}`;

  return formattedTime;
};


export const isLocationOpenNow = (operatingTimes: OperatingTime[] | null): boolean => {
  // No data so we assume it's closed
  if (!operatingTimes) {
    return false;
  }

  const { hours, minutes } = getCentralNow();
  const nowMinutes = hours * 60 + minutes;
  return operatingTimes.some(({ StartHour, StartMinutes, EndHour, EndMinutes }) => {
    const start = Number(StartHour) * 60 + Number(StartMinutes);
    const end = Number(EndHour) * 60 + Number(EndMinutes);
    return nowMinutes >= start && nowMinutes < end;
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

