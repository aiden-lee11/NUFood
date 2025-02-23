import React, { useState, useEffect, useMemo } from 'react'
import { postUserPreferences } from '../util/data';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';
import Preferences from '../components/preferences'
import LocationItemGrid from '../components/locationGrid'
import { useAuth } from '../context/AuthProvider';
import AuthPopup from '../components/AuthPopup';
import { getCurrentTimeOfDayWithLocations, isLocationOpenNow, getDailyLocationOperationTimes } from '../util/helper';
import { DailyItem, Item } from '../types/ItemTypes';
import ErrorPopup from '../components/error-popup';
import { useDataStore } from '@/store';
import DatePicker from '@/components/calendar';
import { format } from "date-fns"


const DailyItems: React.FC = () => {
  // Data involved with auth
  const [showPopup, setShowPopup] = useState(false);
  const { token } = useAuth();

  // Data involved with API
  const staticData = useDataStore((state) => state.UserDataResponse);
  const weeklyItems = staticData.weeklyItems;
  const memoizedLocationHours = useMemo(
    () => getDailyLocationOperationTimes(staticData.locationOperationHours),
    [staticData.locationOperationHours]
  );
  const userPreferences = staticData.userPreferences;

  const setUserPreferences = useDataStore((state) => state.setUserPreferences)
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);

  // Data involved with fuse
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<DailyItem[]>([]);
  const fuse = new Fuse(dailyItems, { keys: ['Name'], threshold: 0.5 });

  // Data involved with display of items
  const locations = ["Sargent", "Elder", "Allison", "Plex East", "Plex West"];
  const [visibleLocations, setVisibleLocations] = useState<string[]>(["Sargent", "Elder", "Allison", "Plex East", "Plex West"]);
  const [visibleTimes, setVisibleTimes] = useState<string[]>([]);
  const [expandFolders, setExpandFolders] = useState(false);
  const timesOfDay = ["Breakfast", "Lunch", "Dinner"];
  const [showPreferences, setShowPreferences] = useState(() => {
    return sessionStorage.getItem("showPreferences") !== "false";
  });
  const [availableFavorites, setAvailableFavorites] = useState<DailyItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());


  // Initialize selected times based on current time
  useEffect(() => {
    if (memoizedLocationHours) {
      const { timeOfDay } = getCurrentTimeOfDayWithLocations(memoizedLocationHours);
      if (timeOfDay) {
        setVisibleTimes([timeOfDay]);
      }
    }
  }, [memoizedLocationHours]);

  useEffect(() => {
    if (weeklyItems && Object.keys(weeklyItems).length != 0) {
      const todaysItems = weeklyItems[new Date().toISOString().split("T")[0]] || []
      setDailyItems(todaysItems);
      // Determine if there is some location that is open, but no items are available
      // If this is the case then there was an error in scraping data and we should display
      // an error message popup to the user
      setShowErrorPopup(!todaysItems && memoizedLocationHours);
    }
  }, [weeklyItems])

  useEffect(() => {
    // Set available favorites based on items that match user preferences
    if (userPreferences && userPreferences.length > 0) {
      const userPrefNames = new Set(userPreferences.map(pref => pref.Name));
      const favorites = dailyItems.filter(item => userPrefNames.has(item.Name));
      setAvailableFavorites(favorites);
    }
  }, [dailyItems]);

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
      if (userPreferences.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
        tempPreferences = userPreferences.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
      } else {
        tempPreferences = [...userPreferences, item];
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

  const togglePreferencesItem = (preferenceType: string, preference: string | boolean) => {
    if (preferenceType === 'location') {
      setVisibleLocations(prev =>
        prev.includes(preference as string)
          ? prev.filter(loc => loc !== preference)
          : [...prev, preference as string]
      );
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

  // Calculate currently open locations for display
  const openLocations = memoizedLocationHours
    ? Object.entries(memoizedLocationHours)
      .filter(([_, times]) => isLocationOpenNow(times))
      .map(([location]) => location)
    : [];


  const handleTogglePreferences = () => {
    const newState = !showPreferences;
    setShowPreferences(newState);
    sessionStorage.setItem("showPreferences", newState.toString());
  };

  return (
    <div className="p-6 min-h-screen bg-transparent">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Daily Items for {format(selectedDate, "PP")}
        <br />
        {openLocations.length > 0 ? `(${openLocations.length} locations open)` : '(All locations closed)'}
      </h1>

      <button
        onClick={handleTogglePreferences}
        className="p-2 rounded-md mb-4 
          bg-background text-gray-900 dark:text-white
           border border-gray-300 dark:border-gray-700
           transition-colors duration-200"
      >
        {"Change What You See"}
      </button>

      <DatePicker
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        setDailyItems={setDailyItems}
      />

      <Preferences
        showPreferences={showPreferences}
        state={{
          locations,
          visibleLocations,
          timesOfDay,
          visibleTimes: visibleTimes,
          expandFolders,
        }}
        actions={{
          togglePreferencesItem,
          setVisibleLocations,
          setShowPreferences: handleTogglePreferences,
        }}
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
          expandFolders
        }}
        actions={{
          handleItemClick
        }}
      />

      {showPopup && (
        <AuthPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
      )}
      <ErrorPopup isOpen={showErrorPopup} onClose={() => setShowErrorPopup(false)} />
    </div>
  );

};

export default DailyItems;
