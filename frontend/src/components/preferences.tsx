import React from 'react';
import { Checkbox } from '@headlessui/react';

interface PreferencesProps {
  showPreferences: boolean;
  locations: string[];
  visibleLocations: string[];
  timesOfDay: string[];
  visibleTimes: string[];
  expandFolders: boolean;
  togglePreferencesItem: (preferenceType: string, preference: string | boolean) => void;
}

const Preferences: React.FC<PreferencesProps> = ({
  showPreferences,
  locations,
  visibleLocations,
  timesOfDay,
  visibleTimes,
  expandFolders,
  togglePreferencesItem,
}) => {
  return (
    <>
      {showPreferences && (
        <div className="p-4 mb-4 bg-background border border-gray-500 rounded-md space-y-4 transition-colors duration-300">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preferences
          </h2>

          {/* Location Checkboxes */}
          <div>
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
              Locations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {locations.map((location) => (
                <div key={location} className="flex items-center gap-2">
                  <Checkbox
                    checked={visibleLocations.includes(location)}
                    onChange={() => togglePreferencesItem('location', location)}
                    className={({ checked }) => `
                    relative w-5 h-5 rounded border 
                    ${checked
                        ? 'bg-gray-600 border-gray-600 dark:bg-gray-500 dark:border-gray-500'
                        : 'bg-white border-gray-300 dark:bg-[#030711] dark:border-gray-600'
                      }
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white-500
                  `}
                  >
                    <span className="sr-only">Select {location}</span>
                    {/* Checkmark icon */}
                    <svg
                      className={`w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      transition-opacity duration-200 ${visibleLocations.includes(location) ? 'opacity-100' : 'opacity-0'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </Checkbox>
                  <span className="text-sm text-gray-900 dark:text-white">{location}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time of Day Checkboxes */}
          <div>
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
              Times of Day
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {timesOfDay.map((time) => (
                <div key={time} className="flex items-center gap-2">
                  <Checkbox
                    checked={visibleTimes.includes(time)}
                    onChange={() => togglePreferencesItem('time', time)}
                    className={({ checked }) => `
                    relative w-5 h-5 rounded border 
                    ${checked
                        ? 'bg-gray-600 border-gray-600 dark:bg-gray-500 dark:border-gray-500'
                        : 'bg-white border-gray-300 dark:bg-[#030711] dark:border-gray-600'
                      }
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white-500
                  `}
                  >
                    <span className="sr-only">Select {time}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      transition-opacity duration-200 ${visibleTimes.includes(time) ? 'opacity-100' : 'opacity-0'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </Checkbox>
                  <span className="text-sm text-gray-900 dark:text-white">{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Preferences */}
          <div>
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visual Preferences
            </h3>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={expandFolders}
                onChange={() => togglePreferencesItem('expandFolders', !expandFolders)}
                className={({ checked }) => `
                relative w-5 h-5 rounded border 
                ${checked
                    ? 'bg-gray-600 border-gray-600 dark:bg-gray-500 dark:border-gray-500'
                    : 'bg-white border-gray-300 dark:bg-[#030711] dark:border-gray-600'
                  }
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white-500
              `}
              >
                <span className="sr-only">Expand Folders</span>
                <svg
                  className={`w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  transition-opacity duration-200 ${expandFolders ? 'opacity-100' : 'opacity-0'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </Checkbox>
              <span className="text-sm text-gray-900 dark:text-white">Expand Folders</span>
            </div>
          </div>
        </div>
      )}
    </>
  );

};

export default Preferences;
