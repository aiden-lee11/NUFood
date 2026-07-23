/**
 * Component: AllItems
 * Description:
 * This component displays a searchable list of items, allowing users to select and favorite items.
 *
 * Features:
 * - Fetches all items and user preferences from the backend or general data if unauthenticated.
 * - Implements a search functionality using Fuse.js for fuzzy searching.
 * - Progressively reveals the client-side list via infinite lazy scroll (IntersectionObserver
 *   sentinel), resetting the window whenever the search query changes.
 * - Allows users to favorite or unfavorite items, with preferences saved to the backend.
 * - Displays an authentication popup if an unauthenticated user tries to favorite an item.
 *
 * Key Components:
 * - `fetchAllData`, `fetchGeneralData`: Fetch data based on authentication state.
 * - `postUserPreferences`: Updates user preferences in the backend.
 * - `Fuse`: Fuzzy search library for filtering items.
 *
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthProvider';
import AuthPopup from '../components/AuthPopup';
import { Item } from '../types/ItemTypes';
import { useDataStore } from '@/store';
import { postUserPreferences } from '@/util/data';
import SEO from '../components/SEO';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';

// Number of rows revealed per lazy-scroll batch.
const ITEMS_PER_BATCH = 50;

const AllItems: React.FC = () => {
  const staticData = useDataStore((state) => state.UserDataResponse);
  var userPreferences = staticData.userPreferences;
  const allItemsStrings = staticData.allItems;
  const setUserPreferences = useDataStore((state) => state.setUserPreferences)

  // Convert string array to Item array for UI compatibility.
  // Memoized so it (and the Fuse index below) aren't rebuilt on every render.
  const allItems: Item[] = useMemo(
    () => allItemsStrings.map(name => ({ Name: name })),
    [allItemsStrings]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);
  const [showPopup, setShowPopup] = useState(false);
  const { toast } = useToast();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { token } = useAuth();

  const fuse = useMemo(
    () =>
      new Fuse(allItems, {
        keys: ['Name'],
        threshold: 0.5,
      }),
    [allItems]
  );

  // Debounce so typing over thousands of items doesn't fuzzy-search on every keystroke.
  const debouncedQuery = useDebounce(searchQuery, 150);

  useEffect(() => {
    if (debouncedQuery) {
      const result = fuse.search(debouncedQuery).map(({ item }) => item);
      setFilteredItems(result);
    } else {
      setFilteredItems(allItems);
    }
    // Reset the lazy-scroll window whenever the result set changes.
    setVisibleCount(ITEMS_PER_BATCH);
  }, [debouncedQuery, allItems, fuse]);

  const handleItemClick = (item: Item) => {
    if (!token) {
      setShowPopup(true);
      return;
    }

    let tempPreferences = userPreferences;
    const formattedItemName = item.Name.toLowerCase().trim();


    if (userPreferences) {
      const previousPreferences = userPreferences;

      if (userPreferences.some(i => i.toLowerCase().trim() === formattedItemName)) {
        tempPreferences = userPreferences.filter(i => i.toLowerCase().trim() !== formattedItemName);
      } else {
        tempPreferences = [...userPreferences, item.Name];
      }

      setUserPreferences(tempPreferences);
      // Revert the optimistic update if the save fails.
      postUserPreferences(tempPreferences, token as string).catch(() => {
        setUserPreferences(previousPreferences);
        toast({
          variant: 'destructive',
          title: "Couldn't save favorite — try again.",
        });
      });
    }
  };

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  // Reveal the next batch when the sentinel scrolls into view.
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + ITEMS_PER_BATCH);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, filteredItems]);

  return (
    <div className="p-6 min-h-screen text-black bg-background dark:text-white transition-colors duration-200">
      <SEO
        title="All Menu Items - NUFood"
        description="Browse and search through all available menu items at Northwestern University dining locations. Find and favorite your preferred dishes."
        keywords="Northwestern University menu, NU all items, campus dining search, Northwestern food database"
        url="https://dining.nu/all"
      />
      <h1 className="text-2xl font-bold mb-4">Select Your Favorite Items</h1>

      <Input
        type="text"
        aria-label="Search items"
        placeholder="Search for an item..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4 w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 bg-background text-black dark:text-white transition-colors duration-200"
      />

      <ul className="space-y-2 mb-6">
        {visibleItems.map((item, index) => {
          const isFavorited = !!(userPreferences && userPreferences.some((fav) => fav === item.Name));
          return (
            <li key={`${item.Name}-${index}`}>
              <button
                onClick={() => handleItemClick(item)}
                aria-pressed={isFavorited}
                aria-label={isFavorited ? `Remove ${item.Name} from favorites` : `Add ${item.Name} to favorites`}
                className={clsx(
                  'w-full text-left p-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.99] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring border-2',
                  isFavorited
                    ? "bg-item-selected text-item-selected-foreground border-primary shadow-sm"
                    : "bg-card text-card-foreground border-border hover:bg-item-hover hover:border-muted-foreground"
                )}
              >
                {item.Name} {isFavorited ? "★" : "☆"}
              </button>
            </li>
          );
        })}
      </ul>

      {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-1" />}

      {showPopup && (
        <AuthPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
};

export default AllItems;
