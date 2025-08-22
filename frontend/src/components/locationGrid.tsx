import React from "react";
import DailyItemAccordion from "./DailyItemAccordion"; // Import the DailyItemAccordion component
import { LocationOperatingTimes } from "../types/OperationTypes";
import { DailyItem } from "../types/ItemTypes";
import Status from "./Status";


interface LocationState {
  locationOperationHours: LocationOperatingTimes | undefined;
  visibleLocations: string[];
  timesOfDay: string[];
  visibleTimes: string[];
  filteredItems: DailyItem[];
  availableFavorites: DailyItem[];
  expandFolders: boolean;
}

interface LocationActions {
  handleItemClick: (item: DailyItem) => void;
}

interface LocationProps {
  state: LocationState;
  actions: LocationActions;
}

const LocationItemGrid: React.FC<LocationProps> = ({ state, actions }) => {
  const {
    locationOperationHours,
    visibleLocations,
    timesOfDay,
    visibleTimes,
    filteredItems,
    availableFavorites,
    expandFolders
  } = state;

  const { handleItemClick } = actions;

  return (
    <div className="min-h-screen p-6 bg-background transition-colors duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {visibleLocations.length > 0 &&
          visibleLocations
            .sort((a, b) => {
              // Count items for each location
              const aHasItems = timesOfDay.some(timeOfDay => 
                filteredItems.some(item => item.Location === a && item.TimeOfDay === timeOfDay)
              );
              const bHasItems = timesOfDay.some(timeOfDay => 
                filteredItems.some(item => item.Location === b && item.TimeOfDay === timeOfDay)
              );
              
              // Locations with items come first
              if (aHasItems && !bHasItems) return -1;
              if (!aHasItems && bHasItems) return 1;
              return 0; // Keep original order for locations with same status
            })
            .map((location) => {
              // Check if this location has any items
              const hasItems = timesOfDay.some(timeOfDay => 
                filteredItems.some(item => item.Location === location && item.TimeOfDay === timeOfDay)
              );
              
              return (
              <div
                key={location}
                className={`p-6 rounded-xl shadow-left-bottom transition-all duration-300 bg-card border border-border ${
                  hasItems ? '' : 'opacity-75'
                }`}
              >
                <h2 className="text-2xl font-bold mb-4 text-card-foreground">{location}</h2>
                {locationOperationHours && (<Status operatingTimes={locationOperationHours[location]} />)}
                {timesOfDay
                  .filter((timeOfDay) => visibleTimes.includes(timeOfDay))
                  .map((timeOfDay) => {
                    const itemsByTimeOfDay = filteredItems.filter(
                      (item) => item.Location === location && item.TimeOfDay === timeOfDay
                    );

                    const filteredAvailableFavorites = Array.from(
                      new Map(
                        availableFavorites
                          .filter(
                            (favorite) =>
                              favorite.Location === location && favorite.TimeOfDay === timeOfDay
                          )
                          .map((favorite) => [favorite.Name, favorite]) // Use `Name` as a key to ensure uniqueness
                      ).values()
                    );

                    return (
                      itemsByTimeOfDay.length > 0 && (
                        <div key={timeOfDay} className="mb-4">
                          <h3 className="text-lg font-semibold mb-3 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
                            {timeOfDay}
                          </h3>
                          {/* Pass filtered availableFavorites */}
                          <DailyItemAccordion
                            items={itemsByTimeOfDay} // Pass filtered items for the time of day
                            availableFavorites={filteredAvailableFavorites} // Pass filtered favorites
                            handleItemClick={handleItemClick} // Pass click handler
                            expandFolders={expandFolders}
                          />
                        </div>
                      )
                    );
                  })}
                
                {/* Show a message if no items available */}
                {!hasItems && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">No items available</p>
                  </div>
                )}
              </div>
              );
            })}
      </div>
    </div>
  );

};

export default LocationItemGrid;
