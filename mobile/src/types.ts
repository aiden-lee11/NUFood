export interface OperatingTime {
  StartHour: number;
  StartMinutes: number;
  EndHour: number;
  EndMinutes: number;
}

// OperationHours screen friendly types (mirrors frontend OperationTypes.ts)
export type LocationOperatingTimes = Record<string, OperatingTime[] | null>;

export interface OperationHoursDay {
  Day: string;
  Date: string;
  Status: string;
  Hours: OperatingTime[] | null;
}

export interface OperationHoursData {
  Name: string;
  Week: OperationHoursDay[];
}

export interface DailyItem {
  Name: string;
  Description?: string;
  Date?: string;
  Location?: string;
  StationName?: string;
  TimeOfDay?: string;
  PortionSize?: string;
  Calories?: string;
  Protein?: string;
  Carbs?: string;
  Fat?: string;
}

export interface GeneralDataResponse {
  allItems: string[];
  weeklyItems: Record<string, DailyItem[]>;
  locationOperatingTimes: OperationHoursData[];
  nutritionGoals?: { Calories: number; Protein: number; Carbs: number; Fat: number };
}


