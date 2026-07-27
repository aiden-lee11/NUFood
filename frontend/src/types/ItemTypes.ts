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
  /** Raw ingredient statement from the hall; often "" or absent. */
  ingredients?: string;
  /**
   * Raw dining-hall tag names — diets ("Vegan", "Avoiding Gluten"), marketing tags
   * ("Good Source of Protein") and allergens ("Milk", "Sesame*" = may contain).
   * Not served in production yet, so treat missing/empty as "no tag data".
   * See `util/dietaryTags.ts` for the semantics.
   */
  filters?: string[];
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

export interface DisplayPreferences {
  visibleLocations: string[];
  hasSavedDisplayPreferences: boolean;
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
  displayPreferences: DisplayPreferences | null;
}
