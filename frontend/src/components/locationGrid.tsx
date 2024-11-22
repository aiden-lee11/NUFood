import React from 'react';
import clsx from 'clsx';

interface Item {
  Name: string;
  Location: string;
  TimeOfDay: string;
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
  handleItemClick: (item: Item) => void;
}

const LocationItemGrid: React.FC<LocationProps> = ({
  locations,
  visibleLocations,
  timesOfDay,
  visibleTimes,
  filteredItems,
  favorites,
  handleItemClick,
}) => {
  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations
          .filter((location) => visibleLocations.includes(location))
          .map((location) => (
            <div
              key={location}
              className="p-6 rounded-md shadow-lg transition-all duration-300 bg-white dark:bg-gray-800"
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{location}</h2>
              {timesOfDay
                .filter((timeOfDay) => visibleTimes.includes(timeOfDay))
                .map((timeOfDay) => {
                  const itemsByTimeOfDay = filteredItems.filter(
                    (item) => item.Location === location && item.TimeOfDay === timeOfDay
                  );

                  return (
                    itemsByTimeOfDay.length > 0 && (
                      <div key={timeOfDay} className="mb-4">
                        <h3 className="text-lg font-semibold mb-3 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
                          {timeOfDay}
                        </h3>
                        <ul className="space-y-2">
                          {itemsByTimeOfDay.map((item, index) => (
                            <li key={`${item.Name}-${index}`}>
                              <button
                                onClick={() => handleItemClick(item)}
                                className={clsx(
                                  'w-full text-left p-3 rounded-md transition-all duration-200 transform hover:scale-105 hover:shadow-md',
                                  favorites.some((fav) => fav.Name === item.Name)
                                    ? "bg-gray-300 dark:bg-gray-700 text-black dark:text-white"
                                    : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
                                )}
                              >
                                {item.Name} {favorites.some((fav) => fav.Name === item.Name) ? '★' : '☆'}
                              </button>
                            </li>
                          ))}
                        </ul>
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
