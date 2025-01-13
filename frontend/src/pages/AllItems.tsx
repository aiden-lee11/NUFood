/**
 * Component: AllItems
 * Description:
 * This component displays a paginated list of items with a search feature, allowing users to select and favorite items.
 * 
 * Features:
 * - Fetches all items and user preferences from the backend or general data if unauthenticated.
 * - Implements a search functionality using Fuse.js for fuzzy searching.
 * - Provides pagination for navigating large datasets.
 * - Allows users to favorite or unfavorite items, with preferences saved to the backend.
 * - Displays an authentication popup if an unauthenticated user tries to favorite an item.
 * 
 * Key Components:
 * - `fetchAllData`, `fetchGeneralData`: Fetch data based on authentication state.
 * - `postUserPreferences`: Updates user preferences in the backend.
 * - `Fuse`: Fuzzy search library for filtering items.
 * 
 */

import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';
import clsx from 'clsx';
import { fetchAllData, fetchGeneralData, postUserPreferences } from '../util/data';
import { useAuth } from '../context/AuthProvider';
import AuthPopup from '../components/AuthPopup';
import { Item } from '../types/ItemTypes';


const ITEMS_PER_PAGE = 100;

const AllItems: React.FC = () => {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [userPreferences, setUserPreferences] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showPopup, setShowPopup] = useState(false); // Popup visibility state

  const { authLoading, token } = useAuth();

  const fuse = new Fuse(allItems, {
    keys: ['Name'],
    threshold: 0.5,
  });

  useEffect(() => {
    if (searchQuery) {
      const result = fuse.search(searchQuery).map(({ item }) => item);
      setFilteredItems(result);
    } else {
      setFilteredItems(allItems);
    }
  }, [searchQuery, allItems]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
    scrollToTop();
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prevPage) => prevPage - 1);
      scrollToTop();
    }
  };

  const handleItemClick = (item: Item) => {
    const formattedItemName = item.Name.toLowerCase().trim();

    if (!token) {
      setShowPopup(true); // Show popup if user is not authenticated
      return; // Exit function to prevent further execution
    }

    let tempPreferences = userPreferences;

    if (userPreferences.some((i) => i.Name.toLowerCase().trim() === formattedItemName)) {
      tempPreferences = userPreferences.filter((i) => i.Name.toLowerCase().trim() !== formattedItemName);
    } else {
      tempPreferences = [...userPreferences, item];
    }

    setUserPreferences(tempPreferences);
    postUserPreferences(tempPreferences, token as string);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!authLoading && token) {
          const data = await fetchAllData(token);
          if (data) {
            setAllItems(data.allItems);
            setUserPreferences(data.userPreferences.map((item: Item) => item));
          }
        } else if (!authLoading && !token) {
          const data = await fetchGeneralData();
          if (data) {
            setAllItems(data.allItems);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [authLoading, token]);

  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  return (
    <div className="p-6 min-h-screen text-black bg-background dark:text-white transition-colors duration-200">
      <h1 className="text-2xl font-bold mb-4">Select Your Favorite Items</h1>

      <Input
        type="text"
        placeholder="Search for an item..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4 w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 bg-background text-black dark:text-white transition-colors duration-200"
      />

      <ul className="space-y-2 mb-6">
        {paginatedItems.map((item, index) => (
          <li key={`${item.Name}-${index}`}>
            <button
              onClick={() => handleItemClick(item)}
              className={clsx(
                'w-full text-left p-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none ',
                userPreferences.some((fav) => fav.Name === item.Name)
                  ? "bg-yellow-100 dark:bg-yellow-700 text-black dark:text-white border-yellow-300 dark:border-yellow-600 border"
                  : "bg-gray-300 dark:bg-[#1a1d24] text-black dark:text-white border-gray-400 dark:border-gray-600"
              )}
            >
              {item.Name} {userPreferences.some((fav) => fav.Name === item.Name) ? "★" : "☆"}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center">
        {currentPage > 0 && (
          <button
            onClick={goToPreviousPage}
            className="p-2 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Previous Page
          </button>
        )}
        {endIndex < filteredItems.length && (
          <button
            onClick={goToNextPage}
            className="p-2 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Next Page
          </button>
        )}
      </div>

      {showPopup && (
        <AuthPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
};

export default AllItems;
