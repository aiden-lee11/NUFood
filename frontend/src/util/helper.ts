import { LocationOperatingTimes, OperationHoursData, OperatingTime } from "../types/OperationTypes";

// Returns
// -- Breakfast if current time is between 8:00 AM and 10:59 AM
// -- Lunch if current time is between 11:00 AM and 4:59 PM
// -- Dinner if current time is between 5:00 PM and 7:59 PM
// -- Empty string if current time is outside of the above ranges
export const getCurrentTimeOfDay = (): string => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  if (currentHour >= 8 && currentHour <= 10) {
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

// Take in the data and return a mapping of location to operation times
// TODO make a test for when its not closed and during open time 
export const getDailyLocationOperationTimes = (data: OperationHoursData[]): LocationOperatingTimes => {
  const locationNameMap: Record<string, string> = {
    "Elder Dining Commons": "Elder",
    "Sargent Dining Commons": "Sargent",
    "Allison Dining Commons": "Allison",
    "Foster Walker Plex East": "Plex East",
    "Foster Walker Plex West & Market": "Plex West",
  };
  const currentTime = new Date();
  const currentDay = currentTime.getDay();

  const res: LocationOperatingTimes = {}

  Object.entries(locationNameMap).forEach(([fullName, shortName]) => {
    const locationData = data.find((loc) => loc.Name === fullName);
    if (!locationData) {
      console.warn(`Location data not found for: ${fullName}`);
      res[shortName] = null; // Handle missing data gracefully
      return;
    }
    const locationDay = locationData.Week[currentDay]

    // If the location is closed we set it to closed else the operation hours else null 
    if (locationDay.Status === "closed") {
      res[shortName] = null
    } else if (locationDay.Hours) {
      res[shortName] = locationDay.Hours
    } else {
      res[shortName] = null
    }
  }
  )
  return res
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

