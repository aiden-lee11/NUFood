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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import AuthPopup from '../components/AuthPopup';
import { Item } from '../types/ItemTypes';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useDataStore } from '@/store';
import { postUserPreferences } from '@/util/data';
import { useBanner } from '@/context/BannerContext';

const ITEMS_PER_PAGE = 100;

const AllItems: React.FC = () => {
  const staticData = useDataStore((state) => state.UserDataResponse);
  var userPreferences = staticData.userPreferences;
  const allItemsStrings = staticData.allItems;
  const setUserPreferences = useDataStore((state) => state.setUserPreferences)

  // Convert string array to Item array for UI compatibility
  const allItems: Item[] = allItemsStrings.map(name => ({ Name: name }));

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPopup, setShowPopup] = useState(false);
  const { containerRef } = useBanner();

  const { token } = useAuth();

  const fuse = new Fuse(allItems, {
    keys: ['Name'],
    threshold: 0.5,
  });

  useEffect(() => {
    if (searchQuery) {
      const result = fuse.search(searchQuery).map(({ item }) => item);
      setFilteredItems(result);
      setCurrentPage(1);
    } else {
      setFilteredItems(allItems);
    }
  }, [searchQuery, allItems]);

  const handleItemClick = (item: Item) => {
    if (!token) {
      setShowPopup(true);
      return;
    }

    let tempPreferences = userPreferences;
    const formattedItemName = item.Name.toLowerCase().trim();


    if (userPreferences) {
      if (userPreferences.some(i => i.toLowerCase().trim() === formattedItemName)) {
        tempPreferences = userPreferences.filter(i => i.toLowerCase().trim() !== formattedItemName);
      } else {
        tempPreferences = [...userPreferences, item.Name];
      }

      setUserPreferences(tempPreferences);
      postUserPreferences(tempPreferences, token as string);
    }
  };


  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  // Generate array of page numbers to show
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pageNumbers.push(1);

    // Calculate start and end of visible page numbers
    let start = Math.max(currentPage - 1, 2);
    let end = Math.min(currentPage + 1, totalPages - 1);

    // Adjust if we're near the start or end
    if (currentPage <= 3) {
      end = 4;
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - 3;
    }

    // Add ellipsis and numbers
    if (start > 2) {
      pageNumbers.push('...');
    }
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    if (end < totalPages - 1) {
      pageNumbers.push('...');
    }

    // Always show last page if there are more pages
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [currentPage]);

  return (
    <div className="p-6 min-h-screen text-black bg-background dark:text-white transition-colors duration-200">
      <h1 className="text-2xl font-bold mb-4">Select Your Favorite Items</h1>

      {totalPages > 1 && (
        <div className="mb-4">
          {/* Mobile Pagination */}
          <div className="flex sm:hidden items-center justify-between">
            <button
              onClick={() => {
                if (currentPage > 1) setCurrentPage(currentPage - 1);
              }}
              disabled={currentPage <= 1}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </button>
            
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => {
                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
              }}
              disabled={currentPage >= totalPages}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Desktop Pagination */}
          <div className="hidden sm:block">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {getPageNumbers().map((pageNum, idx) => (
                  <PaginationItem key={idx}>
                    {pageNum === '...' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(Number(pageNum));
                        }}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

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
                'w-full text-left p-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-md focus:outline-none border-2',
                (userPreferences && userPreferences.some((fav) => fav === item.Name))
                  ? "bg-item-selected text-item-selected-foreground border-primary shadow-sm"
                  : "bg-card text-card-foreground border-border hover:bg-item-hover hover:border-muted-foreground"
              )}
            >
              {item.Name} {userPreferences && userPreferences.some((fav) => fav === item.Name) ? "★" : "☆"}
            </button>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-6">
          {/* Mobile Pagination */}
          <div className="flex sm:hidden items-center justify-between">
            <button
              onClick={() => {
                if (currentPage > 1) setCurrentPage(currentPage - 1);
              }}
              disabled={currentPage <= 1}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </button>
            
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => {
                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
              }}
              disabled={currentPage >= totalPages}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Desktop Pagination */}
          <div className="hidden sm:block">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {getPageNumbers().map((pageNum, idx) => (
                  <PaginationItem key={idx}>
                    {pageNum === '...' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(Number(pageNum));
                        }}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

      {showPopup && (
        <AuthPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
};

export default AllItems;
