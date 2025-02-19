import React, { useState } from 'react';
import { postUserPreferences } from '../util/data';
import { useAuth } from '../context/AuthProvider';
import { FavoriteItem } from '../types/ItemTypes';
import { useDataStore } from '@/store';


const Preferences: React.FC = () => {
  var userPreferences = useDataStore((state) => state.UserDataResponse.userPreferences)
  const setUserPreferences = useDataStore((state) => state.setUserPreferences)

  const { token } = useAuth();


  const handleItemClick = (item: FavoriteItem) => {
    if (userPreferences) {
      let tempPreferences = userPreferences;
      const formattedItemName = item.Name.toLowerCase().trim();
      if (userPreferences.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
        tempPreferences = userPreferences.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
      } else {
        tempPreferences = [...userPreferences, item];
      }
      setUserPreferences(tempPreferences);
      postUserPreferences(tempPreferences, token as string);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-transparent">
      <h1 className="text-2xl font-bold mb-4 text-black dark:text-white">Your Favorite Items</h1>

      {(userPreferences && userPreferences.length > 0) ? (
        <ul className="space-y-2">
          {userPreferences.map((item, index) => (
            <li
              key={index}
              className="flex justify-between items-center p-3 rounded-md bg-gray-200 dark:bg-[#1a1d24] text-black dark:text-white transition-transform duration-200 transform hover:translate-y-[-2px] hover:shadow-md"
            >
              <span>{item.Name}</span>
              <button
                onClick={() => handleItemClick(item)}
                className="text-black dark:text-white hover:text-red-700 dark:hover:text-red-500 transition-colors duration-200"
                aria-label="Remove from favorites"
              >
                −
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-black dark:text-white">You have no favorite items yet.</p>
      )}
    </div>
  );
};

export default Preferences;
