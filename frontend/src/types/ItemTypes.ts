import { OperationHoursData } from "./OperationTypes";

export interface DailyItem {
  Name: string;
  Description: string;
  Location: string;
  StationName: string;
  Date: string;
  TimeOfDay: string;
  portion?: string;
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}

export interface Item {
  Name: string;
}

export interface FavoriteItem extends Item { }

export interface WeeklyItemsMap {
  [key: string]: DailyItem[];
}

// Nutrition goals interface
export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Base interface for shared properties
interface BaseDataResponse {
  allItems: string[];
  weeklyItems: WeeklyItemsMap;
  locationOperationHours: OperationHoursData[];
}

// Interface for general data without user-specific data
export interface GeneralDataResponse extends BaseDataResponse { }

// Interface for data with user preferences
export interface UserDataResponse extends BaseDataResponse {
  userPreferences: string[] | null;
  mailing: boolean;
  nutritionGoals: NutritionGoals;
}
