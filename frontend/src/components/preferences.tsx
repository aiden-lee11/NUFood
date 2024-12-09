import React from 'react';
import { Checkbox, CheckboxField, CheckboxGroup } from '../components/checkbox';

// Types for the props
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
      {/* Preferences Box */}
      {showPreferences && (
        <div className="p-4 mb-4 bg-gray-100 dark:bg-zinc-900 rounded-md space-y-4 transition-colors duration-300">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h2>

          {/* Location Checkboxes */}
          <div>
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Locations</h3>
            <CheckboxGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {locations.map((location) => (
                  <CheckboxField key={location}>
                    <Checkbox
                      name="locations"
                      value={location}
                      checked={visibleLocations.includes(location)}
                      onChange={() => togglePreferencesItem('location', location)}
                    />
                    <label className="ml-2 text-gray-900 dark:text-white">{location}</label>
                  </CheckboxField>
                ))}
              </div>
            </CheckboxGroup>
          </div>

          {/* Time of Day Checkboxes */}
          <div>
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Times of Day</h3>
            <CheckboxGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {timesOfDay.map((time) => (
                  <CheckboxField key={time}>
                    <Checkbox
                      name="timesOfDay"
                      value={time}
                      checked={visibleTimes.includes(time)}
                      onChange={() => togglePreferencesItem('time', time)}
                    />
                    <label className="ml-2 text-gray-900 dark:text-white">{time}</label>
                  </CheckboxField>
                ))}
              </div>
            </CheckboxGroup>
          </div>

          {/* Visual Preferences */}
          <div>
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Visual Preferences</h3>
            <CheckboxGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <CheckboxField>
                  <Checkbox
                    name="expandFolders"
                    value="expandFolders"
                    checked={expandFolders}
                    onChange={() => togglePreferencesItem('expandFolders', !expandFolders)}
                  />
                  <label className="ml-2 text-gray-900 dark:text-white">Expand Folders</label>
                </CheckboxField>

              </div>
            </CheckboxGroup>
          </div>
        </div>
      )}
    </>
  );
};

export default Preferences;
