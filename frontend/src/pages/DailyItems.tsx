import React, { useState, useEffect } from 'react'
import { fetchAllData, fetchGeneralData, postUserPreferences } from '../util/data';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';
import Preferences from '../components/preferences'
import LocationItemGrid from '../components/locationGrid'
import { useAuth } from '../context/AuthProvider';
import AuthPopup from '../components/AuthPopup';
import { getCurrentTimeOfDay, getDailyLocationOperationTimes } from '../util/helper';
import { DailyItem, Item, GeneralDataResponse, UserDataResponse } from '../types/ItemTypes';
import { locationToHours } from '../types/OperationTypes';


const DailyItems: React.FC = () => {
  // Data involved with API
  const [locations, setLocations] = useState(["Elder", "Sargent", "Allison", "Plex East", "Plex West"]);
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);
  const [favorites, setFavorites] = useState<Item[]>([]);
  const [availableFavorites, setAvailableFavorites] = useState<DailyItem[]>([]);
  const [allClosed, setAllClosed] = useState<boolean>(false);
  const [locationOperationHours, setLocationOperationHours] = useState<locationToHours>();

  // Data involved with fuse
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<DailyItem[]>([]);
  const fuse = new Fuse(dailyItems, { keys: ['Name'], threshold: 0.5 });

  // Data involved with display of items
  const [visibleLocations, setVisibleLocations] = useState<string[]>(locations);
  const [visibleTimes, setVisibleTimes] = useState<string[]>(getCurrentTimeOfDay());
  const [expandFolders, setExpandFolders] = useState(false); // New state for collapsing all preferences
  const [showPreferences, setShowPreferences] = useState(false);
  const timesOfDay = ["Breakfast", "Lunch", "Dinner"];

  // Data involved with auth
  const [showPopup, setShowPopup] = useState(false);
  const { authLoading, token } = useAuth();


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
      setShowPopup(true); // Show popup if user is not authenticated
      return; // Exit function to prevent further execution
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
      tempAvailable = [...availableFavorites, dailyItems.find(i => i.Name.toLowerCase().trim() === formattedItemName) as DailyItem];
    }

    setFavorites(tempPreferences);
    setAvailableFavorites(tempAvailable);
    postUserPreferences(tempPreferences, token as string);
  };

  const togglePreferencesItem = (preferenceType: string, preference: string | boolean) => {
    if (preferenceType === 'location') {
      setVisibleLocations(prev => prev.includes(preference as string) ? prev.filter(loc => loc !== preference) : [...prev, preference as string]);
    } else if (preferenceType === 'time') {
      setVisibleTimes(prev => prev.includes(preference as string) ? prev.filter(t => t !== preference) : [...prev, preference as string]);
    } else if (preferenceType === 'expandFolders') {
      setExpandFolders(preference as boolean);
    }
  }

  useEffect(() => {
    const processData = (data: GeneralDataResponse | UserDataResponse) => {
      if (data.allClosed) {
        setAllClosed(true);
      } else {
        const locations: string[] = Array.from(new Set(data.dailyItems?.map((item: DailyItem) => item.Location) || []));
        setLocations(locations);
        setDailyItems(data.dailyItems || []);

        if ('userPreferences' in data) {
          setFavorites(data.userPreferences?.map((item: Item) => item) || []);
          setAvailableFavorites(data.availableFavorites || []);
        }
      }

      // Will always have location operating times data
      setLocationOperationHours(getDailyLocationOperationTimes(data.locationOperatingTimes))

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

  return (
    <div className="p-6 min-h-screen bg-transparent">
      {allClosed && (
        <div className="flex justify-center items-center h-full text-center bg-yellow-100 text-yellow-800 p-4 rounded-md shadow-md">
          <h2 className="text-xl font-bold">All dining halls are currently closed.</h2>
        </div>
      )}
      <>
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Daily Items
        </h1>

        {/* Preferences Toggle */}
        <button
          onClick={() => setShowPreferences(!showPreferences)}
          className="p-2 rounded-md mb-4 
             bg-white-100 text-black 
             dark:bg-black-700 dark:text-white 
             border border-gray-300 dark:border-gray-700
             transition-colors duration-200"
        >
          {showPreferences ? "Hide Preferences" : "Show Preferences"}
        </button>

        {/* Preferences Box */}
        {showPreferences &&
          Preferences({
            showPreferences,
            locations,
            visibleLocations,
            timesOfDay,
            visibleTimes,
            expandFolders,
            togglePreferencesItem,
          })}

        {/* Search Input */}
        <Input
          type="text"
          placeholder="Search for an item..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4 w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent 
            bg-gray-100 text-gray-900 border-gray-300 focus:ring-gray-500 
            dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:focus:ring-gray-400"
        />


        {/* LocationItem Grid */}
        <LocationItemGrid
          locations={locations}
          locationOperationHours={locationOperationHours}
          visibleLocations={visibleLocations}
          timesOfDay={timesOfDay}
          visibleTimes={visibleTimes}
          filteredItems={filteredItems}
          availableFavorites={availableFavorites}
          favorites={favorites}
          expandFolders={expandFolders}
          handleItemClick={handleItemClick}
        />

        {showPopup && <AuthPopup onClose={() => setShowPopup(false)} />}
      </>
      )
    </div>
  );
};

export default DailyItems;

