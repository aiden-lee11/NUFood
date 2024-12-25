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


// Base interface for shared properties
interface BaseDataResponse {
  allClosed: boolean | null;
  dailyItems: DailyItem[] | null;
  allItems: Item[];
  date: string;
  locationOperations: OperationHoursData[];
}

// Interface for general data without user-specific data
export interface GeneralDataResponse extends BaseDataResponse { }

// Interface for data with user preferences
export interface UserDataResponse extends BaseDataResponse {
  userPreferences: Item[] | null;
  availableFavorites: DailyItem[] | null;
}
