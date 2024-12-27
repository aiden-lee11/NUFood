import React, { useEffect, useState } from 'react';
import { fetchAllLocationOperatingTimes } from '../util/data';
import { getWeekday } from '../util/helper';
import { OperationHoursData, Hour } from '../types/OperationTypes';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/table'

type locationMapping = { [key: string]: string[] }

const OperationHours: React.FC = () => {
  const [locationOperatingTimes, setLoctionOperatingTimes] = useState<OperationHoursData[]>([]);
  const locationGrouping: locationMapping = {
    "Dining Commons": ["Allison Dining Commons", "Sargent Dining Commons", "Foster Walker Plex East", "Foster Walker Plex West & Market", "Elder Dining Commons"],
    "Norris Center": ["847 Burger", "Buen Dia", "Shake Smart", "Chicken & Boba", "Wildcat Deli", "Starbucks", "MOD Pizza", "Market at Norris"],

    "Retail Dining": ["Protein Bar", "847 Late Night at Fran's", "Tech Express", "Backlot at Kresge Cafe", "Cafe Coralie", "Lisa's Cafe", "Café Bergson"],

    "Chicago Campus": ["Harry's Cafe", "SLICE Pizzeria", "Starbucks (Chicago Campus)"],
  }


  const formatTime = (hour: string, minutes: string): string => {
    const hourInt = parseInt(hour, 10);
    const minutesInt = parseInt(minutes, 10);

    // Determine AM/PM
    const period = hourInt >= 12 ? "p" : "a";
    const formattedHour = hourInt > 12 ? hourInt - 12 : hourInt === 0 ? 12 : hourInt;

    // Format the time as "hh:mm"
    const formattedTime = `${formattedHour}:${minutesInt.toString().padStart(2, "0")}${period}`;

    return formattedTime;
  };

  const formatHours = (hours: Hour[] | null) => {
    if (hours === null) return "Closed";

    // Map over all the hours and format each time range
    const formattedHours = hours.map(({ StartHour, StartMinutes, EndHour, EndMinutes }) => {
      const startFormatted = formatTime(StartHour, StartMinutes);
      const endFormatted = formatTime(EndHour, EndMinutes);
      return `${startFormatted} - ${endFormatted}`;
    });

    // Join all time ranges with a space in between
    return formattedHours.map((hour, index) => <span key={index}>{hour}<br /></span>);
  };

  useEffect(() => {
    fetchAllLocationOperatingTimes().then((data) => {
      setLoctionOperatingTimes(data.locationOperatingTimes);
    });
  }, []);

  // TODOD need to make responsive especially for mobile this looks awful :D 
  return (
    <div>
      {Object.keys(locationGrouping).map((group) => (
        <div key={group} className="overflow-x-auto mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{group}</h2>
          <Table grid className="min-w-full table-auto">
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
                    {locationData?.Week.map((day) => {
                      const hours = day?.Hours
                      return (
                        <TableCell key={day.Date} className="p-2">
                          {formatHours(hours)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
};

// <TableBody>
// {locationOperatingTimes.map((location) => (
//   <TableRow key={location.Name}>
//     <TableCell className="font-medium p-2">{location.Name}</TableCell>
//       {location.Week.map((day) => (
//         <TableCell key={day.Date} className="p-2">
//           {day.Status === "closed" ? "Closed" : formatHours(day.Hours)}
//           </TableCell>
//       ))}
//     </TableRow>
// ))}
// </TableBody>
export default OperationHours;

