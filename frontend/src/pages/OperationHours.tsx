// components/OperationHours.tsx
import React from "react";
import { getWeekday, formatTime, locationAliases } from "../util/helper";
import { OperationHoursData, OperatingTime } from "../types/OperationTypes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/Table";
import { useDataStore } from "@/store";

type LocationGrouping = { [category: string]: string[] };

const locationGrouping: LocationGrouping = {
  "Dining Commons": ["Allison", "Sargent", "Plex East", "Plex West", "Elder"],
  "Norris Center": [
    "847 Burger",
    "Buen Dia",
    "Shake Smart",
    "Chicken & Boba",
    "Wildcat Deli",
    "Starbucks",
    "MOD Pizza",
    "Market at Norris",
  ],
  "Retail Dining": [
    "Protein Bar",
    "847 Late Night at Fran's",
    "Tech Express",
    "Backlot at Kresge Cafe",
    "Cafe Coralie",
    "Lisa's Cafe",
    "Café Bergson",
  ],
};

const OperationHours: React.FC = () => {
  const rawData: OperationHoursData[] = useDataStore(
    (s) => s.UserDataResponse.locationOperationHours
  );

  // grab days header from the first available entry
  const weekDays = rawData[0]?.Week || [];

  // helper: given a shortName, find the actual payload entry
  const findByAlias = (shortName: string) => {
    const aliases = locationAliases[shortName] || [shortName];
    return rawData.find((d) => aliases.includes(d.Name));
  };

  // helper to render one day's hours
  const renderHours = (hours: OperatingTime[] | null) =>
    !hours
      ? "Closed"
      : hours.map((h, i) => (
        <span key={i}>
          {formatTime(h.StartHour, h.StartMinutes)} –{" "}
          {formatTime(h.EndHour, h.EndMinutes)}
          <br />
        </span>
      ));

  return (
    <div>
      {Object.entries(locationGrouping).map(([groupName, shortNames]) => (
        <div key={groupName} className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            {groupName}
          </h2>

          {/* Table for wide screens */}
          <div className="hidden sm:block overflow-x-auto">
            <Table bordered className="min-w-full table-auto bg-card shadow-lg rounded-lg overflow-hidden">
              <TableHead className="bg-primary/70">
                <TableRow>
                  <TableHeader className="p-3 font-semibold text-secondary-foreground">Location</TableHeader>
                  {weekDays.map((day) => (
                    <TableHeader key={day.Date} className="p-3 font-semibold text-foreground text-center">
                      {getWeekday(parseInt(day.Day, 10))}
                      <br />
                      <span className="text-sm opacity-75">({day.Date.slice(5)})</span>
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {shortNames.map((shortName) => {
                  const loc = findByAlias(shortName);
                  return (
                    <TableRow key={shortName} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="p-3 font-medium text-card-foreground border-r border-border">
                        {shortName}
                      </TableCell>
                      {loc?.Week.map((day) => (
                        <TableCell key={day.Date} className="p-3 text-center text-sm text-card-foreground">
                          {day.Status === "closed"
                            ? <span className="text-destructive font-medium">Closed</span>
                            : <span className="text-primary font-medium">{renderHours(day.Hours)}</span>}
                        </TableCell>
                      )) ||
                        // if nothing matched, render "Closed" for each day
                        weekDays.map((day) => (
                          <TableCell key={day.Date} className="p-3 text-center text-sm text-card-foreground">
                            <span className="text-destructive font-medium">Closed</span>
                          </TableCell>
                        ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Cards for small screens */}
          <div className="block sm:hidden space-y-4">
            {shortNames.map((shortName) => {
              const loc = findByAlias(shortName);
              return (
                <div
                  key={shortName}
                  className="p-4 border-2 border-border rounded-lg shadow-md bg-card hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold mb-3 text-primary border-b border-border pb-1">
                    {shortName}
                  </h3>
                  {loc?.Week.map((day) => (
                    <div
                      key={day.Date}
                      className="flex justify-between text-sm border-t border-border/50 pt-2 mt-2"
                    >
                      <span className="font-medium text-card-foreground">
                        {getWeekday(parseInt(day.Day, 10))}
                      </span>
                      <span className={day.Status === "closed" ? "text-destructive font-medium" : "text-primary font-medium"}>
                        {day.Status === "closed"
                          ? "Closed"
                          : renderHours(day.Hours)}
                      </span>
                    </div>
                  )) ||
                    weekDays.map((day) => (
                      <div
                        key={day.Date}
                        className="flex justify-between text-sm border-t border-border/50 pt-2 mt-2"
                      >
                        <span className="font-medium text-card-foreground">
                          {getWeekday(parseInt(day.Day, 10))}
                        </span>
                        <span className="text-destructive font-medium">Closed</span>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OperationHours;
