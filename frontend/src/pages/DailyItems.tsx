
import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { postUserPreferences } from '../util/userPreferences';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';

interface DailyItem {
  Name: string;
  Description: string;
  Location: string;
  Date: string;
  TimeOfDay: string;
}

interface Item {
  Name: string;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const DailyItems: React.FC = () => {
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);
  const [favorites, setFavorites] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

  const [user, authLoading] = useAuthState(auth);
  const userId = user?.uid || '';

  const navigate = useNavigate();

  const fuse = new Fuse(dailyItems, {
    keys: ['Name'], // Search by 'Name' property
    threshold: 0.5, // Adjust this for more or less strict matching
  });

  useEffect(() => {
    if (searchQuery) {
      const result = fuse.search(searchQuery).map(({ item }) => item);
      setFilteredItems(result);
    } else {
      setFilteredItems(dailyItems); // Show all items if search is empty
    }
  }, [searchQuery, dailyItems]); // Add dependencies here

  // Fetch userPreferences based on userID
  const getUserPreferences = async () => {
    const response = await fetch(`${API_URL}/api/userPreferences?userID=${userId}`);
    const data = await response.json();
    const preferences = data.Favorites;
    console.log('User preferences:', preferences);
    setFavorites(preferences.map((item: Item) => item));
  };

  // Fetch daily items 
  const fetchDailyItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dailyItems`);

      if (!response.ok) {
        if (response.status === 404) {
          console.error("Daily Items not found");
          return;
        } else {
          console.error("Error fetching daily Items:", response.statusText);
        }
        return;
      }

      const data = await response.json();
      console.log('Daily Items:', data);
      // Get rid of duplicate names in the daily items 
      const uniqueItems = Array.from(new Set(data.map((item: DailyItem) => item.Name)))
        .map(name => data.find((item: DailyItem) => item.Name === name));
      setDailyItems(uniqueItems);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const handleItemClick = (item: Item) => {
    let tempPreferences = favorites;
    // Convert item name to lowercase and trim whitespace
    const formattedItemName = item.Name.toLowerCase().trim();

    if (favorites.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
      // Remove the item if it already exists in the array
      tempPreferences = favorites.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
      setFavorites(tempPreferences);
    } else {
      // Add the item to preferences if it doesn't exist
      tempPreferences = [...favorites, item];
      setFavorites(tempPreferences);
    }

    console.log('User preferences of temp:', tempPreferences);
    postUserPreferences(tempPreferences, userId);
  };


  useEffect(() => {
    if (!authLoading && userId) {
      // Fetch user preferences and daily items once
      getUserPreferences();
      fetchDailyItems();
    } else if (!userId && !authLoading) {
      console.error("User ID not found. Redirecting to login.");
      // Redirect to login page if no user is found
      navigate('/login', { replace: true });
    }
    // Only run this effect when `authLoading` or `userId` change
  }, [authLoading, userId, navigate]);

  return (
    <div className="p-6 min-h-screen bg-transparent">
      <h1 className="text-2xl font-bold mb-4 text-white">Daily Items For Today</h1>


      <Input
        type="text"
        placeholder="Search for an item..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4 w-full p-2 border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-gray-800 text-white"
      />

      <ul className="space-y-2 mb-6">
        {filteredItems.map((item, index) => (
          <li key={`${item.Name}-${index}`}>
            <button
              onClick={() => handleItemClick(item)}
              className={clsx(
                "w-full text-left p-3 rounded-md transition-colors duration-200",
                favorites.some((fav) => fav.Name === item.Name)
                  ? "bg-gray-700 text-white"
                  : "bg-gray-800 text-white"
              )}
            >
              {item.Name} {favorites.some((fav) => fav.Name === item.Name) ? "★" : "☆"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DailyItems;
