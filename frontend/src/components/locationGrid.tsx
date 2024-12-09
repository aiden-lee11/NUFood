import React from "react";
import DailyItemAccordion from "./DailyItemAccordion"; // Import the DailyItemAccordion component

interface Item {
  Name: string;
  Location: string;
  TimeOfDay: string;
  StationName: string;
  Description: string;
  Date: string;
}

interface FavoriteItem {
  Name: string;
}

interface LocationProps {
  locations: string[];
  visibleLocations: string[];
  timesOfDay: string[];
  visibleTimes: string[];
  filteredItems: Item[];
  favorites: FavoriteItem[];
  availableFavorites: Item[];
  expandFolders: boolean;
  handleItemClick: (item: Item) => void;
}

const LocationItemGrid: React.FC<LocationProps> = ({
  locations,
  visibleLocations,
  timesOfDay,
  visibleTimes,
  filteredItems,
  availableFavorites,
  favorites,
  expandFolders,
  handleItemClick,
}) => {

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-zinc-900 transition-colors duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations
          .filter((location) => visibleLocations.includes(location))
          .map((location) => (
            <div
              key={location}
              className="p-6 rounded-md shadow-lg transition-all duration-300 bg-white dark:bg-zinc-900"
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{location}</h2>
              {timesOfDay
                .filter((timeOfDay) => visibleTimes.includes(timeOfDay))
                .map((timeOfDay) => {
                  const itemsByTimeOfDay = filteredItems.filter(
                    (item) => item.Location === location && item.TimeOfDay === timeOfDay
                  );

                  const filteredAvailableFavorites = availableFavorites.filter(
                    (favorite) =>
                      favorite.Location === location && favorite.TimeOfDay === timeOfDay
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
                          favorites={favorites} // Pass favorites
                          handleItemClick={handleItemClick} // Pass click handler
                          expandFolders={expandFolders}
                        />
                      </div>
                    )
                  );
                })}
            </div>
          ))}
      </div>
    </div>
  );
};

export default LocationItemGrid;
