import React, { useState, useEffect, useMemo, useRef } from 'react'
import { postDisplayPreferences, postUserPreferences } from '../util/data';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';
import LocationItemGrid from '../components/locationGrid'
import { useAuth } from '../context/AuthProvider';
import AuthPopup from '../components/AuthPopup';
import { getCurrentTimeOfDayWithLocations, getDailyLocationOperationTimes } from '../util/helper';
import { DailyItem, Item } from '../types/ItemTypes';
import ErrorPopup from '../components/error-popup';
import { useDataStore } from '@/store';
import { HeaderControls } from "../components/header-controls"
import SEO from '../components/SEO';
import { toLocalISODate } from '../util/date';
import { loadDisplayPreferences, saveDisplayPreferences } from '../util/displayPreferences';

const DEFAULT_LOCATIONS = ["Sargent", "Elder", "Allison", "Plex East", "Plex West"];

const DailyItems: React.FC = () => {
  // Data involved with auth
  const [showPopup, setShowPopup] = useState(false);
  const { token, authLoading } = useAuth();

  // Read browser-native display preferences synchronously so the very first paint
  // is already correct — no popup flash, no "all halls -> your halls" collapse.
  const initialDisplayPrefs = useMemo(() => loadDisplayPreferences(DEFAULT_LOCATIONS), []);

  // Data involved with display of items
  const locations = DEFAULT_LOCATIONS;
  const [visibleLocations, setVisibleLocations] = useState<string[]>(initialDisplayPrefs.visibleLocations);
  const [visibleTimes, setVisibleTimes] = useState<string[]>([]);
  const [expandFolders, setExpandFolders] = useState(false);
  const timesOfDay = ["Breakfast", "Lunch", "Dinner"];
  // The Display Settings dialog opens only when the user clicks the Display Settings button
  // (no first-visit auto-open — the slow first load it once masked has since been optimized).
  const [showPreferences, setShowPreferences] = useState(false);
  const [availableFavorites, setAvailableFavorites] = useState<DailyItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [openLocations, setOpenLocations] = useState<string[]>([])
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const hasHydratedSignedInDisplayPrefs = useRef(false);
  const hasAutoSelectedTimes = useRef(false);

  // Data involved with API
  const staticData = useDataStore((state) => state.UserDataResponse);
  const weeklyItems = staticData.weeklyItems;
  const memoizedLocationHours = useMemo(
    () => getDailyLocationOperationTimes(staticData.locationOperationHours, selectedDate),
    [staticData.locationOperationHours, selectedDate]
  );
  const userPreferences = staticData.userPreferences;
  const displayPreferences = staticData.displayPreferences;
  const setUserPreferences = useDataStore((state) => state.setUserPreferences)
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);
  // On sign-out, allow the backend-adopt below to run again if the user signs back in.
  // Note: we intentionally do NOT reset visibleLocations here — display preferences are
  // browser-native and should survive sign-out without a flash.
  useEffect(() => {
    if (!authLoading && !token) {
      hasHydratedSignedInDisplayPrefs.current = false;
    }
  }, [authLoading, token]);

  // Cross-device sync: on a fresh browser (nothing saved locally yet) adopt the
  // signed-in user's server-side preferences once. If this browser already has saved
  // preferences, localStorage wins and we never overwrite it — that's what avoids the
  // late "third hydration" the user was seeing.
  useEffect(() => {
    if (!token || !displayPreferences || hasHydratedSignedInDisplayPrefs.current) {
      return;
    }
    hasHydratedSignedInDisplayPrefs.current = true;

    if (initialDisplayPrefs.hasSavedDisplayPreferences) {
      return;
    }

    if (displayPreferences.hasSavedDisplayPreferences) {
      setVisibleLocations(displayPreferences.visibleLocations);
      setShowPreferences(false);
      saveDisplayPreferences(displayPreferences.visibleLocations);
    }
  }, [token, displayPreferences, initialDisplayPrefs]);

  // Data involved with fuse
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<DailyItem[]>([]);
  const fuse = new Fuse(dailyItems, { keys: ['Name'], threshold: 0.5 });



  // Initialize selected times based on current time
  useEffect(() => {
    if (memoizedLocationHours) {
      const { timeOfDay, openLocations } = getCurrentTimeOfDayWithLocations(memoizedLocationHours);

      // Auto-select the current meal only once on initial mount. Re-running on every date
      // change would clobber the user's Display Settings meal toggles.
      if (!hasAutoSelectedTimes.current) {
        hasAutoSelectedTimes.current = true;
        // Outside serving hours getCurrentTimeOfDay() returns "" — default to all three meals
        // so the home page never renders an empty meal list late at night.
        setVisibleTimes(timeOfDay ? [timeOfDay] : ["Breakfast", "Lunch", "Dinner"]);
      }

      if (openLocations) {
        setOpenLocations(openLocations)
      }
    }
  }, [memoizedLocationHours]);

  useEffect(() => {
    if (weeklyItems && Object.keys(weeklyItems).length != 0) {
      const selectedItems = weeklyItems[toLocalISODate(selectedDate)] || []
      setDailyItems(selectedItems);
      // Determine if there is some location that is open, but no items are available
      // If this is the case then there was an error in scraping data and we should display
      // an error message popup to the user
      // Only flag a scrape error when there are zero items AND at least one hall is
      // actually open that day. memoizedLocationHours is always a truthy object whose
      // values are Hour[] (open) or null (closed), so check the values, not the object.
      const anyHallOpen = Object.values(memoizedLocationHours).some(Boolean);
      setShowErrorPopup(selectedItems.length === 0 && anyHallOpen);
    }
  }, [weeklyItems, selectedDate, memoizedLocationHours])

  useEffect(() => {
    // Set available favorites based on items that match user preferences
    if (userPreferences && userPreferences.length > 0) {
      const userPrefNames = new Set(userPreferences);
      const favorites = dailyItems.filter(item => userPrefNames.has(item.Name));
      setAvailableFavorites(favorites);
    } else {
      // Clear favorites when user preferences are empty/null (e.g., on sign out)
      setAvailableFavorites([]);
    }
  }, [dailyItems, userPreferences]);

  useEffect(() => {
    if (searchQuery) {
      const result = fuse.search(searchQuery).map(({ item }) => item);
      setFilteredItems(result);
    } else {
      setFilteredItems(dailyItems);
    }
  }, [searchQuery, dailyItems]);

  const handleItemClick = (item: Item) => {
    if (!token) {
      setShowPopup(true);
      return;
    }

    let tempPreferences = userPreferences;
    let tempAvailable = availableFavorites;
    const formattedItemName = item.Name.toLowerCase().trim();


    if (userPreferences) {
      if (userPreferences.some(i => i.toLowerCase().trim() === formattedItemName)) {
        tempPreferences = userPreferences.filter(i => i.toLowerCase().trim() !== formattedItemName);
      } else {
        tempPreferences = [...userPreferences, item.Name];
      }

      if (availableFavorites.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
        tempAvailable = availableFavorites.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
      } else {
        tempAvailable = [...availableFavorites, ...dailyItems.filter(i => i.Name.toLowerCase().trim() === formattedItemName)];
      }

      setUserPreferences(tempPreferences);
      setAvailableFavorites(tempAvailable);
      postUserPreferences(tempPreferences, token as string);
    }
  };

  const persistVisibleLocations = (nextVisibleLocations: string[]) => {
    // Browser-native first (source of truth for the next paint)...
    saveDisplayPreferences(nextVisibleLocations);
    // ...then mirror to the backend for signed-in cross-device sync.
    if (token) {
      postDisplayPreferences(nextVisibleLocations, token);
    }
  };

  const setVisibleLocationsAndPersist = (nextVisibleLocations: string[]) => {
    setVisibleLocations(nextVisibleLocations);
    persistVisibleLocations(nextVisibleLocations);
  };

  const togglePreferencesItem = (preferenceType: string, preference: string | boolean) => {
    if (preferenceType === 'location') {
      setVisibleLocations(prev => {
        const nextVisibleLocations = prev.includes(preference as string)
          ? prev.filter(loc => loc !== preference)
          : [...prev, preference as string];
        persistVisibleLocations(nextVisibleLocations);
        return nextVisibleLocations;
      });
    } else if (preferenceType === 'time') {
      setVisibleTimes(prev =>
        prev.includes(preference as string)
          ? prev.filter(t => t !== preference)
          : [...prev, preference as string]
      );
    } else if (preferenceType === 'expandFolders') {
      setExpandFolders(preference as boolean);
    }
  }

  const handleTogglePreferences = (show: boolean) => {
    setShowPreferences(show);
  };

  return (
    <div className="p-6 min-h-screen bg-transparent">
      <SEO 
        title="Today's Menu - NUFood"
        description="Discover today's dining options at Northwestern University. Find what's available now at your favorite campus dining locations."
        keywords="Northwestern University dining today, NU daily menu, campus food today, Northwestern dining hours"
        url="https://nufood.me/"
      />
      <HeaderControls
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        setDailyItems={setDailyItems}
        showPreferences={showPreferences}
        preferencesState={{
          locations,
          visibleLocations,
          timesOfDay,
          visibleTimes,
          expandFolders,
        }}
        preferencesActions={{
          togglePreferencesItem,
          setVisibleLocations: setVisibleLocationsAndPersist,
          setShowPreferences: handleTogglePreferences,
        }}
        openLocations={openLocations}
      />

      <Input
        type="text"
        placeholder="Search for an item..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent 
          text-gray-900 border-gray-300 focus:ring-gray-500 
          bg-background dark:text-white dark:border-gray-600 dark:focus:ring-gray-400"
      />

      <LocationItemGrid
        state={{
          locationOperationHours: memoizedLocationHours,
          visibleLocations,
          timesOfDay,
          visibleTimes,
          filteredItems,
          availableFavorites,
          expandFolders,
        }}
        actions={{
          handleItemClick,
        }}
      />

      {showPopup && <AuthPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />}
      <ErrorPopup isOpen={showErrorPopup} onClose={() => setShowErrorPopup(false)} />
    </div>
  )

};

export default DailyItems;
