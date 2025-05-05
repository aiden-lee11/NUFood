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
          <h2 className="text-2xl font-bold mb-4">
            {groupName}
          </h2>

          {/* Table for wide screens */}
          <div className="hidden sm:block overflow-x-auto">
            <Table bordered className="min-w-full table-auto">
              <TableHead>
                <TableRow>
                  <TableHeader className="p-2">Location</TableHeader>
                  {weekDays.map((day) => (
                    <TableHeader key={day.Date} className="p-2">
                      {getWeekday(parseInt(day.Day, 10))}
                      <br />
                      ({day.Date.slice(5)})
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {shortNames.map((shortName) => {
                  const loc = findByAlias(shortName);
                  return (
                    <TableRow key={shortName}>
                      <TableCell className="p-2">
                        {shortName}
                      </TableCell>
                      {loc?.Week.map((day) => (
                        <TableCell key={day.Date} className="p-2">
                          {day.Status === "closed"
                            ? "Closed"
                            : renderHours(day.Hours)}
                        </TableCell>
                      )) ||
                        // if nothing matched, render “Closed” for each day
                        weekDays.map((day) => (
                          <TableCell key={day.Date} className="p-2">
                            Closed
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
                  className="p-4 border rounded-lg shadow-sm bg-background"
                >
                  <h3 className="text-lg font-semibold mb-2">
                    {shortName}
                  </h3>
                  {loc?.Week.map((day) => (
                    <div
                      key={day.Date}
                      className="flex justify-between text-sm border-t pt-2"
                    >
                      <span>
                        {getWeekday(parseInt(day.Day, 10))}
                      </span>
                      <span>
                        {day.Status === "closed"
                          ? "Closed"
                          : renderHours(day.Hours)}
                      </span>
                    </div>
                  )) ||
                    weekDays.map((day) => (
                      <div
                        key={day.Date}
                        className="flex justify-between text-sm border-t pt-2"
                      >
                        <span>
                          {getWeekday(parseInt(day.Day, 10))}
                        </span>
                        <span>Closed</span>
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
