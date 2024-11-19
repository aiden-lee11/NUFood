import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { fetchAllData, postUserPreferences } from '../util/data';

interface FavoriteItem {
  Name: string;
}

const Preferences: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [user, authLoading] = useAuthState(auth);
  const userId = user?.uid || '';
  const navigate = useNavigate();

  // Fetch user favorites based on userID
  const fetchFavorites = async () => {
    const data = await fetchAllData(userId);
    setFavorites(data.userPreferences.map((item: FavoriteItem) => item));
  };

  const handleItemClick = (item: FavoriteItem) => {
    let tempPreferences = favorites;
    const formattedItemName = item.Name.toLowerCase().trim();
    if (favorites.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
      tempPreferences = favorites.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
    } else {
      tempPreferences = [...favorites, item];
    }
    setFavorites(tempPreferences);
    postUserPreferences(tempPreferences, userId);
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchFavorites();
    }
  }, [authLoading, userId]);


  if (!userId) {
    console.error("User ID not found. Redirecting to login.");
    // Redirect to login page if no user is found
    navigate('/login');
  }

  return (
    <div className="p-6 min-h-screen bg-transparent">
      <h1 className="text-2xl font-bold mb-4 text-white">Your Favorite Items</h1>

      {favorites.length > 0 ? (
        <ul className="space-y-2">
          {favorites.map((item, index) => (
            <li
              key={index}
              className="flex justify-between items-center p-3 rounded-md bg-gray-800 text-white transition-transform duration-200 transform hover:translate-y-[-2px] hover:shadow-lg"
            >
              <span>{item.Name}</span>
              <button
                onClick={() => handleItemClick(item)}
                className="text-white-500 hover:text-red-700 transition-colors duration-200"
                aria-label="Remove from favorites"
              >
                −
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-white">You have no favorite items yet.</p>
      )}
    </div>
  );
};

export default Preferences;
