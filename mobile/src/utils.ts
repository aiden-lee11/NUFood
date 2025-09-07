import { OperationHoursData, OperatingTime } from './types';

export const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8081';

export const formatTime = (hour: number, minutes: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${formattedHour}:${minutes.toString().padStart(2, '0')}${period}`;
};

export const locationAliases: Record<string, string[]> = {
  Elder: ['Elder Dining Commons'],
  Sargent: ['Sargent Dining Commons'],
  Allison: ['Allison Dining Commons'],
  'Plex East': ['Foster Walker Plex East'],
  'Plex West': ['Foster Walker Plex West & Market', 'Foster Walker Plex West'],
  // Norris Center
  '847 Burger': ['847 Burger'],
  'Buen Dia': ['Buen Dia', 'Buen Día'],
  'Shake Smart': ['Shake Smart'],
  'Chicken & Boba': ['Chicken & Boba', 'Chicken and Boba'],
  'Wildcat Deli': ['Wildcat Deli'],
  Starbucks: ['Starbucks'],
  'MOD Pizza': ['MOD Pizza'],
  'Market at Norris': ['Market at Norris'],
  // Chicago campus
  'Cafe Coralie': ['Cafe Coralie'],
  "Lisa's Cafe": ["Lisa's Cafe"],
  'Café Bergson': ['Café Bergson', 'Cafe Bergson'],
};

export function getDailyLocationOperationTimes(
  data: OperationHoursData[],
  date: Date
): Record<string, OperatingTime[] | null> {
  const currentDay = date.getDay();
  const res: Record<string, OperatingTime[] | null> = {};
  for (const [shortName, aliases] of Object.entries(locationAliases)) {
    const loc = data.find((d) => aliases.includes(d.Name));
    if (!loc) {
      res[shortName] = null;
      continue;
    }
    const dayInfo = loc.Week[currentDay];
    res[shortName] = dayInfo.Status === 'closed' || !dayInfo.Hours ? null : dayInfo.Hours;
  }
  return res;
}

export const getCurrentTimeOfDay = (): string => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  if (currentHour >= 7 && currentHour <= 10) return 'Breakfast';
  if (currentHour >= 11 && currentHour <= 16) return 'Lunch';
  if (currentHour >= 17 && currentHour <= 22) return 'Dinner';
  return '';
};

export const mapFullLocationToShort = (fullName?: string): string => {
  if (!fullName) return 'Unknown';
  for (const [short, aliases] of Object.entries(locationAliases)) {
    if (aliases.includes(fullName)) return short;
  }
  return fullName;
};

export const defaultExpandedStations = [
  'My Favorites',
  'Comfort',
  'Comfort 1',
  'Comfort 2',
  'Rooted',
  'Rooted 1',
  'Rooted 2',
  'Pure Eats',
  'Pure Eats 1',
  'Pure Eats 2',
  'Kitchen Entree',
  'Kitchen Sides',
];

export const getWeekday = (dateNum: number): string => {
  switch (dateNum) {
    case 0:
      return 'Sunday';
    case 1:
      return 'Monday';
    case 2:
      return 'Tuesday';
    case 3:
      return 'Wednesday';
    case 4:
      return 'Thursday';
    case 5:
      return 'Friday';
    case 6:
      return 'Saturday';
    default:
      return '';
  }
};



