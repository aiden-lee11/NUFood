import React, { useState, useEffect } from 'react';
import { fetchAllData, postUserPreferences } from '../util/data';
import { useAuth } from '../context/AuthProvider';
import { FavoriteItem } from '../types/ItemTypes';


const Preferences: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const { authLoading, token } = useAuth();


  const handleItemClick = (item: FavoriteItem) => {
    let tempPreferences = favorites;
    const formattedItemName = item.Name.toLowerCase().trim();
    if (favorites.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
      tempPreferences = favorites.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
    } else {
      tempPreferences = [...favorites, item];
    }
    setFavorites(tempPreferences);
    postUserPreferences(tempPreferences, token as string);
  };

  useEffect(() => {
    // Define the async function inside useEffect
    const fetchFavorites = async () => {
      try {
        if (!authLoading && token) {
          // Fetch user favorites based on userID
          const data = await fetchAllData(token as string);
          setFavorites(data.userPreferences.map((item: FavoriteItem) => item));
        }
      } catch (error) {
        console.error('Error fetching user favorites:', error);
      }
    };

    // Call the async function
    fetchFavorites();
  }, [authLoading, token]);

  return (
    <div className="p-6 min-h-screen bg-transparent">
      <h1 className="text-2xl font-bold mb-4 text-black dark:text-white">Your Favorite Items</h1>

      {favorites.length > 0 ? (
        <ul className="space-y-2">
          {favorites.map((item, index) => (
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
