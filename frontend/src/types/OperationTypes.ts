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
  StartHour: string;
  StartMinutes: string;
  EndHour: string;
  EndMinutes: string;
}

export interface OperatingTime extends Hour {
}

export interface LocationOperatingTimes {
  [key: string]: Hour[] | null;
}
