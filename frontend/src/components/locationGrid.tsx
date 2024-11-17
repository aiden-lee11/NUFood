import React from 'react';
import clsx from 'clsx';

interface Item {
  Name: string;
  Location: string;
  TimeOfDay: string;
}

interface favoriteItem {
  Name: string;
}

interface locationProps {
  locations: string[];
  visibleLocations: string[];
  timesOfDay: string[];
  visibleTimes: string[];
  filteredItems: Item[];
  favorites: favoriteItem[];
  handleItemClick: (item: Item) => void;
}

const LocationItemGrid: React.FC<locationProps> = ({
  locations,
  visibleLocations,
  timesOfDay,
  visibleTimes,
  filteredItems,
  favorites,
  handleItemClick,
}) => {
  return (
    <div className="grid grid-cols-5 gap-4">
      {locations
        .filter((location) => visibleLocations.includes(location))
        .map((location) => (
          <div
            key={location}
            className="bg-gray-900 p-4 rounded-md space-y-4 self-start min-h-0"
          >
            <h2 className="text-xl font-bold mb-2 text-white">{location}</h2>

            {timesOfDay
              .filter((timeOfDay) => visibleTimes.includes(timeOfDay))
              .map((timeOfDay) => {
                const itemsByTimeOfDay = filteredItems.filter(
                  (item) => item.Location === location && item.TimeOfDay === timeOfDay
                );

                return (
                  itemsByTimeOfDay.length > 0 && (
                    <div key={timeOfDay} className="mb-4">
                      <h3 className="text-lg font-semibold mb-2 text-gray-300 border-b border-gray-700 pb-1">
                        {timeOfDay}
                      </h3>
                      <ul className="space-y-2">
                        {itemsByTimeOfDay.map((item, index) => (
                          <li key={`${item.Name}-${index}`}>
                            <button
                              onClick={() => handleItemClick(item)}
                              className={clsx(
                                'w-full text-left p-2 rounded-md transition-all duration-200 transform hover:translate-y-[-2px] hover:shadow-lg',
                                favorites.some((fav) => fav.Name === item.Name)
                                  ? 'bg-gray-700 text-white'
                                  : 'bg-gray-800 text-white'
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
  );
};

export default LocationItemGrid;
