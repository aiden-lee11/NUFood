import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { fetchAllData, postUserPreferences } from '../util/data';
import { useAuth } from '../context/AuthProvider';

interface Item {
  Name: string; // Assuming your items have a 'Name' property
}

const ITEMS_PER_PAGE = 100;

const AllItems: React.FC = () => {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [userPreferences, setUserPreferences] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();

  // Can also grab user from this if needed 
  const { authLoading, token } = useAuth();

  // Fuse.js options for fuzzy search
  const fuse = new Fuse(allItems, {
    keys: ['Name'],
    threshold: 0.5,
  });

  // Filter items using Fuse.js whenever searchQuery changes
  useEffect(() => {
    if (searchQuery) {
      const result = fuse.search(searchQuery).map(({ item }) => item);
      setFilteredItems(result);
    } else {
      setFilteredItems(allItems);
    }
  }, [searchQuery, allItems]);

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Navigate to the next page and scroll to the top
  const goToNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
    scrollToTop();
  };

  // Navigate to the previous page and scroll to the top
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prevPage) => prevPage - 1);
      scrollToTop();
    }
  };

  const handleItemClick = (item: Item) => {
    let tempPreferences = userPreferences;
    const formattedItemName = item.Name.toLowerCase().trim();

    if (userPreferences.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
      tempPreferences = userPreferences.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
      setUserPreferences(tempPreferences);
    } else {
      tempPreferences = [...userPreferences, item];
      setUserPreferences(tempPreferences);
    }

    postUserPreferences(tempPreferences, token as string);
  };

  useEffect(() => {
    if (!authLoading && token) {
      fetchAllData(token).then((data) => {
        if (data) {
          setAllItems(data.allItems);
          setUserPreferences(data.userPreferences.map((item: Item) => item));
        }
      });
    }
  }, [authLoading, token]);

  if (!token && !authLoading) {
    navigate('/login');
  }

  // Calculate items to display based on the current page
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  return (
    <div className="p-6 min-h-screen bg-transparent">
      <h1 className="text-2xl font-bold mb-4 text-white">Select Your Favorite Items</h1>

      <Input
        type="text"
        placeholder="Search for an item..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-gray-800 text-white"
      />

      <ul className="space-y-2 mb-6">
        {paginatedItems.map((item) => (
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

      <div className="flex justify-between items-center">
        {currentPage > 0 && (
          <button
            onClick={goToPreviousPage}
            className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
          >
            Previous Page
          </button>
        )}
        {endIndex < filteredItems.length && (
          <button
            onClick={goToNextPage}
            className="p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
          >
            Next Page
          </button>
        )}
      </div>
    </div>
  );
};

export default AllItems;
