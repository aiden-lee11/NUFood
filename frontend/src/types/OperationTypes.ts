export interface OperationHoursData {
  Name: string;
  Week: Day[];
}

export interface Day {
  Day: string;
  Date: string;
  Status: string;
  Hours: Hour[] | null;
}

export interface Hour {
  StartHour: number;
  StartMinutes: number;
  EndHour: number;
  EndMinutes: number;
}

export interface OperatingTime extends Hour {
}

export interface LocationOperatingTimes {
  [key: string]: Hour[] | null;
}
