import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';
import clsx from 'clsx';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { fetchAllData, postUserPreferences } from '../util/data';

interface Item {
  Name: string; // Assuming your items have a 'Name' property
}

const FavoriteItems: React.FC = () => {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [userPreferences, setUserPreferences] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const [filteredItems, setFilteredItems] = useState<Item[]>([]); // State for filtered items
  const [user, authLoading] = useAuthState(auth); // authLoading shows whether Firebase is loading
  const userId = user?.uid || '';
  // Fuse.js options for fuzzy search
  const fuse = new Fuse(allItems, {
    keys: ['Name'], // Search by 'Name' property
    threshold: 0.5, // Adjust this for more or less strict matching
  });

  const navigate = useNavigate();

  // Filter items using Fuse.js whenever searchQuery changes
  useEffect(() => {
    if (searchQuery) {
      const result = fuse.search(searchQuery).map(({ item }) => item);
      setFilteredItems(result);
    } else {
      setFilteredItems(allItems); // Show all items if search is empty
    }
  }, [searchQuery, allItems]);

  const handleItemClick = (item: Item) => {
    let tempPreferences = userPreferences;
    // Convert item name to lowercase and trim whitespace
    const formattedItemName = item.Name.toLowerCase().trim();

    if (userPreferences.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
      // Remove the item if it already exists in the array
      tempPreferences = userPreferences.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
      setUserPreferences(tempPreferences);
    } else {
      // Add the item to preferences if it doesn't exist
      tempPreferences = [...userPreferences, item];
      setUserPreferences(tempPreferences);
    }

    postUserPreferences(tempPreferences, userId);
  };



  useEffect(() => {
    // Only fetch dailyItems if Firebase auth is not loading and we have a valid user
    if (!authLoading && userId) {
      fetchAllData(userId).then((data) => {
        if (data) {
          setAllItems(data.allItems);
          setUserPreferences(data.userPreferences.map((item: Item) => item));
        }
      });
    }
  }, [authLoading, userId]); // Re-run when authLoading changes or we get a new userId


  if (!userId && !authLoading) {
    console.error("User ID not found. Redirecting to login.");
    // Redirect to login page if no user is found
    navigate('/login');
  }
  return (
    <div className="p-6 min-h-screen bg-transparent ">
      <h1 className="text-2xl font-bold mb-4 text-white">
        Select Your Favorite Items
      </h1>

      <Input
        type="text"
        placeholder="Search for an item..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4 w-full p-2 border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-gray-800 text-white"
      />

      <ul className="space-y-2 mb-6">
        {filteredItems.map((item) => (
          <li key={item.Name}>
            <button
              onClick={() => handleItemClick(item)}
              className={clsx(
                "w-full text-left p-3 rounded-md transition-colors duration-200",
                userPreferences.some((fav) => fav.Name === item.Name)
                  ? "bg-gray-700 text-white"
                  : "bg-gray-800 text-white"
              )}
            >
              {item.Name}{" "}
              {userPreferences.some((fav) => fav.Name === item.Name) ? "★" : "☆"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FavoriteItems;
