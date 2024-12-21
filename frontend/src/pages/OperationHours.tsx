import React, { useEffect, useState } from 'react';
import { fetchAllOperationHours } from '../util/data';

interface OperationHours {
  Name: string;
  Week: Day[];
}

interface Day {
  Day: string;
  Date: string;
  Status: string;
  Hours: Hour[] | null;
}

interface Hour {
  StartHour: string;
  StartMinutes: string;
  EndHour: string;
  EndMinutes: string;
}

const OperationHours: React.FC = () => {
  const [operationHours, setOperationHours] = useState<OperationHours[]>([]);

  useEffect(() => {
    fetchAllOperationHours().then((data) => {
      setOperationHours(data.operationHours);
    });
  }, []);

  console.log(operationHours);

  return (
    <div className="p-6 min-h-screen bg-white text-black dark:bg-zinc-900 dark:text-white transition-colors duration-200">
      <h1 className="text-2xl font-bold mb-4">Operation Hours</h1>

      <div className="space-y-6">
        {operationHours.map((location) => (
          <div
            key={location.Name}
            className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow transition-all duration-200"
          >
            <h2 className="text-xl font-semibold border-b border-gray-300 dark:border-gray-700 pb-2 mb-2">
              {location.Name}
            </h2>

            <ul className="space-y-4">
              {location.Week.map((day) => (
                <li
                  key={day.Date}
                  className={`
                    p-4 rounded-md shadow-sm transition-transform transform
                    ${day.Status === "closed"
                      ? "bg-red-100 dark:bg-red-900"
                      : "bg-green-100 dark:bg-green-900"
                    }
                  `}
                >
                  <h3 className="text-lg font-semibold">
                    {day.Day} ({day.Date})
                  </h3>
                  <p className="mt-1">
                    <span className="font-bold">Status:</span>{" "}
                    {day.Status.charAt(0).toUpperCase() + day.Status.slice(1)}
                  </p>

                  {day.Status !== "closed" && day.Hours && day.Hours.length > 0 ? (
                    <div className="mt-2">
                      <span className="font-bold">Hours:</span>
                      <ul className="ml-4 list-disc">
                        {day.Hours.map((hour, index) => (
                          <li key={index} className="mt-1">
                            {hour.StartHour}:{hour.StartMinutes} - {hour.EndHour}:{hour.EndMinutes}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-2 text-gray-600 dark:text-gray-300">No hours available</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OperationHours;

