import { OperationHoursData } from "./OperationTypes";

export interface DailyItem {
  Name: string;
  Description: string;
  Location: string;
  StationName: string;
  Date: string;
  TimeOfDay: string;
}

export interface Item {
  Name: string;
}

export interface FavoriteItem extends Item { }

export interface WeeklyItemsMap {
  [key: string]: DailyItem[];
}

// Base interface for shared properties
interface BaseDataResponse {
  allItems: Item[];
  weeklyItems: WeeklyItemsMap;
  locationOperationHours: OperationHoursData[];
}

// Interface for general data without user-specific data
export interface GeneralDataResponse extends BaseDataResponse { }

// Interface for data with user preferences
export interface UserDataResponse extends BaseDataResponse {
  userPreferences: Item[] | null;
  mailing: boolean;
}
