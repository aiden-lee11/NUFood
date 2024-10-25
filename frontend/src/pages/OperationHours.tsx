/**
 * Component: OperationHours
 * Description:
 * This component displays the operating hours for various dining locations grouped by category.
 * 
 * Features:
 * - Fetches operating hours data from the backend.
 * - Dynamically generates tables and card layouts to display location hours.
 * - Supports responsive design for mobile and desktop views.
 * 
 * Key Components:
 * - `fetchAllLocationOperatingTimes`: Fetches operating hours from the backend.
 * - `formatHours`: Formats the time range for display.
 * - Tables for larger screens and cards for smaller screens.
 * 
 * TODO:
 * - Improve the responsiveness for mobile views.
 */

import React, { useEffect, useState } from 'react';
import { fetchAllLocationOperatingTimes } from '../util/data';
import { getWeekday, formatTime } from '../util/helper';
import { OperationHoursData, Hour } from '../types/OperationTypes';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/Table'

type locationMapping = { [key: string]: string[] }

const OperationHours: React.FC = () => {
  const [locationOperatingTimes, setLoctionOperatingTimes] = useState<OperationHoursData[]>([]);
  const locationGrouping: locationMapping = {
    "Dining Commons": ["Allison Dining Commons", "Sargent Dining Commons", "Foster Walker Plex East", "Foster Walker Plex West & Market", "Elder Dining Commons"],
    "Norris Center": ["847 Burger", "Buen Dia", "Shake Smart", "Chicken & Boba", "Wildcat Deli", "Starbucks", "MOD Pizza", "Market at Norris"],

    "Retail Dining": ["Protein Bar", "847 Late Night at Fran's", "Tech Express", "Backlot at Kresge Cafe", "Cafe Coralie", "Lisa's Cafe", "Café Bergson"],

    "Chicago Campus": ["Harry's Cafe", "SLICE Pizzeria", "Starbucks (Chicago Campus)"],
  }

  useEffect(() => {
    fetchAllLocationOperatingTimes().then((data) => {
      setLoctionOperatingTimes(data.locationOperatingTimes);
    });
  }, []);
  const formatHours = (hours: Hour[] | null) => {
    if (hours === null) return "Closed";

    // Map over all the hours and format each time range
    const formattedHours = hours.map(({ StartHour, StartMinutes, EndHour, EndMinutes }) => {
      const startFormatted = formatTime(StartHour, StartMinutes);
      const endFormatted = formatTime(EndHour, EndMinutes);
      return `${startFormatted} - ${endFormatted}`;
    });

    // Join all time ranges with a space in between
    return formattedHours.map((hour, index) => <span key={index}> {hour} < br /> </span>);
  };

  // TODOD need to make responsive especially for mobile this looks awful :D 
  return (
    <div>
      {Object.keys(locationGrouping).map((group) => (
        <div key={group} className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{group}</h2>

          {/* Table layout for large screens */}
          <div className="hidden sm:block overflow-x-auto">
            <Table bordered className="min-w-full table-auto">
              <TableHead>
                <TableRow>
                  <TableHeader className="p-2">Location</TableHeader>
                  {locationOperatingTimes?.[0]?.Week?.map((day) => (
                    <TableHeader key={day.Date} className="p-2">
                      {getWeekday(parseInt(day.Day))}
                      <br />
                      ({day.Date.slice(5)})
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {locationGrouping[group].map((location) => {
                  const locationData = locationOperatingTimes.find((data) => data.Name === location);
                  return (
                    <TableRow key={location}>
                      <TableCell className="p-2">{location}</TableCell>
                      {locationData?.Week.map((day) => (
                        <TableCell key={day.Date} className="p-2">
                          {day.Status == "closed" ? "Closed" : formatHours(day?.Hours)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Card layout for small screens */}
          <div className="block sm:hidden space-y-4">
            {locationGrouping[group].map((location) => {
              const locationData = locationOperatingTimes.find((data) => data.Name === location);
              return (
                <div
                  key={location}
                  className="p-4 border border-gray-300 rounded-lg shadow-sm bg-background"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{location}</h3>
                  {locationData?.Week.map((day) => (
                    <div key={day.Date} className="flex justify-between text-sm border-t border-gray-200 py-2">
                      <span className="text-gray-600 dark:text-gray-400">{getWeekday(parseInt(day.Day))}</span>
                      <span className="text-gray-800 dark:text-gray-200">{day.Status == "closed" ? "Closed" : formatHours(day?.Hours)}</span>
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

