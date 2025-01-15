/**
 * DailyItems Component
 * 
 * This React component manages and displays daily dining items for users. 
 * Users can view items, search, filter by preferences (e.g., location, time), and save favorites.
 * 
 * Features:
 * - Fetches daily items and user preferences from an API.
 * - Implements fuzzy search for item names.
 * - Allows filtering by location, time of day, and other preferences.
 * - Supports user authentication for saving favorites.
 * 
 * Props: None
 * 
 * Author: Aiden Lee
 * Date: 1/7/2025
 */

import React, { useState, useEffect } from 'react'
import { fetchAllData, fetchGeneralData, postUserPreferences } from '../util/data';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';
import Preferences from '../components/preferences'
import LocationItemGrid from '../components/locationGrid'
import { useAuth } from '../context/AuthProvider';
import AuthPopup from '../components/AuthPopup';
import { getDailyLocationOperationTimes, getCurrentTimeOfDayWithLocations, isLocationOpenNow } from '../util/helper';
import { DailyItem, Item, GeneralDataResponse, UserDataResponse } from '../types/ItemTypes';
import { LocationOperatingTimes } from '../types/OperationTypes';
import ErrorPopup from '../components/error-popup';


const DailyItems: React.FC = () => {
  // Data involved with API
  const [locations, setLocations] = useState(["Elder", "Sargent", "Allison", "Plex East", "Plex West"]);
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);
  const [favorites, setFavorites] = useState<Item[]>([]);
  const [availableFavorites, setAvailableFavorites] = useState<DailyItem[]>([]);
  const [locationOperationHours, setLocationOperationHours] = useState<LocationOperatingTimes>();
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // Data involved with fuse
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<DailyItem[]>([]);
  const fuse = new Fuse(dailyItems, { keys: ['Name'], threshold: 0.5 });

  // Data involved with display of items
  const [visibleLocations, setVisibleLocations] = useState<string[]>(locations);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [expandFolders, setExpandFolders] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const timesOfDay = ["Breakfast", "Lunch", "Dinner"];

  // Data involved with auth
  const [showPopup, setShowPopup] = useState(false);
  const { authLoading, token } = useAuth();

  // Initialize selected times based on current time
  useEffect(() => {
    if (locationOperationHours) {
      const { timeOfDay } = getCurrentTimeOfDayWithLocations(locationOperationHours);
      if (timeOfDay) {
        setSelectedTimes([timeOfDay]);
      }
    }
  }, [locationOperationHours])


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

    let tempPreferences = favorites;
    let tempAvailable = availableFavorites;
    const formattedItemName = item.Name.toLowerCase().trim();


    if (favorites.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
      tempPreferences = favorites.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
    } else {
      tempPreferences = [...favorites, item];
    }

    if (availableFavorites.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
      tempAvailable = availableFavorites.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
    } else {
      tempAvailable = [...availableFavorites, ...dailyItems.filter(i => i.Name.toLowerCase().trim() === formattedItemName)];
    }

    setFavorites(tempPreferences)
    setAvailableFavorites(tempAvailable);
    postUserPreferences(tempPreferences, token as string);
  };

  const togglePreferencesItem = (preferenceType: string, preference: string | boolean) => {
    if (preferenceType === 'location') {
      setVisibleLocations(prev =>
        prev.includes(preference as string)
          ? prev.filter(loc => loc !== preference)
          : [...prev, preference as string]
      );
    } else if (preferenceType === 'time') {
      setSelectedTimes(prev =>
        prev.includes(preference as string)
          ? prev.filter(t => t !== preference)
          : [...prev, preference as string]
      );
    } else if (preferenceType === 'expandFolders') {
      setExpandFolders(preference as boolean);
    }
  }

  useEffect(() => {
    const processData = (data: GeneralDataResponse | UserDataResponse) => {
      if (!data.allClosed) {
        const locations: string[] = Array.from(new Set(data.dailyItems?.map((item: DailyItem) => item.Location) || []));
        setLocations(locations);
        setDailyItems(data.dailyItems || []);

        if ('userPreferences' in data) {
          setFavorites(data.userPreferences?.map((item: Item) => item) || []);
          setAvailableFavorites(data.availableFavorites || []);
        }
      }

      setLocationOperationHours(getDailyLocationOperationTimes(data.locationOperatingTimes));
    };

    const fetchData = async () => {
      try {
        if (!authLoading) {
          let data: GeneralDataResponse | UserDataResponse;
          if (token) {
            data = await fetchAllData(token);
          } else {
            data = await fetchGeneralData();
          }

          if (data) {
            processData(data);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [authLoading, token]);

  // Calculate currently open locations for display
  const openLocations = locationOperationHours
    ? Object.entries(locationOperationHours)
      .filter(([_, times]) => isLocationOpenNow(times))
      .map(([location]) => location)
    : [];

  // Determine if there is some location that is open, but no items are available
  // If this is the case then there was an error in scraping data and we should display
  // an error message popup to the user
  const noExpectedData = !dailyItems.length && locationOperationHours;


  useEffect(() => {
    if (noExpectedData) {
      setShowErrorPopup(true);
    }
  }, [noExpectedData]);
  return (
    <div className="p-6 min-h-screen bg-transparent">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Daily Items {openLocations.length > 0 ? `(${openLocations.length} locations open)` : '(All locations closed)'}
      </h1>

      <button
        onClick={() => setShowPreferences(!showPreferences)}
        className="p-2 rounded-md mb-4 
           bg-white-100 text-black 
           dark:bg-[#030711] dark:text-white 
           border border-gray-300 dark:border-gray-700
           transition-colors duration-200"
      >
        {showPreferences ? "Hide Preferences" : "Show Preferences"}
      </button>

      {showPreferences &&
        <Preferences
          showPreferences={showPreferences}
          locations={locations}
          visibleLocations={visibleLocations}
          timesOfDay={timesOfDay}
          visibleTimes={selectedTimes}
          expandFolders={expandFolders}
          togglePreferencesItem={togglePreferencesItem}
        />
      }

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
        locationOperationHours={locationOperationHours}
        visibleLocations={visibleLocations}
        timesOfDay={timesOfDay}
        visibleTimes={selectedTimes}
        filteredItems={filteredItems}
        availableFavorites={availableFavorites}
        expandFolders={expandFolders}
        handleItemClick={handleItemClick}
      />

      {showPopup && (
        <AuthPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
      )}
      <ErrorPopup isOpen={showErrorPopup} onClose={() => setShowErrorPopup(false)} />
    </div>
  );

};

export default DailyItems;
