import React, { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { fetchAllData, postUserPreferences } from '../util/data';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Input } from '@headlessui/react';
import Preferences from '../components/preferences'
import LocationItemGrid from '../components/locationGrid'
import { Button } from '../components/button';

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

const DailyItems: React.FC = () => {
  const locations = ["Elder", "Sargent", "Allison", "Plex East", "Plex West"];
  const timesOfDay = ["Breakfast", "Lunch", "Dinner"];
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);
  const [favorites, setFavorites] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<DailyItem[]>([]);
  const [visibleLocations, setVisibleLocations] = useState<string[]>(locations);
  const [visibleTimes, setVisibleTimes] = useState<string[]>(timesOfDay);
  const [showPreferences, setShowPreferences] = useState(false); // Toggle for preferences visibility

  const [user, authLoading] = useAuthState(auth);
  const userId = user?.uid || '';
  const navigate = useNavigate();
  const fuse = new Fuse(dailyItems, { keys: ['Name'], threshold: 0.5 });

  useEffect(() => {
    if (searchQuery) {
      const result = fuse.search(searchQuery).map(({ item }) => item);
      setFilteredItems(result);
    } else {
      setFilteredItems(dailyItems);
    }
  }, [searchQuery, dailyItems]);

  const handleItemClick = (item: Item) => {
    let tempPreferences = favorites;
    const formattedItemName = item.Name.toLowerCase().trim();
    if (favorites.some(i => i.Name.toLowerCase().trim() === formattedItemName)) {
      tempPreferences = favorites.filter(i => i.Name.toLowerCase().trim() !== formattedItemName);
    } else {
      tempPreferences = [...favorites, item];
    }
    setFavorites(tempPreferences);
    postUserPreferences(tempPreferences, userId);
  };

  const toggleLocationVisibility = (location: string) => {
    setVisibleLocations(prev =>
      prev.includes(location) ? prev.filter(loc => loc !== location) : [...prev, location]
    );
  };

  const toggleTimeVisibility = (time: string) => {
    setVisibleTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchAllData(userId).then((data) => {
        if (data) {
          setFavorites(data.userPreferences.map((item: Item) => item));
          const uniqueItems = Array.from(new Set(data.dailyItems.map((item: DailyItem) => item.Name)))
            .map(name => data.dailyItems.find((item: DailyItem) => item.Name === name));
          setDailyItems(uniqueItems);
        }
      });
    } else if (!userId && !authLoading) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, userId, navigate]);

  return (
    <div className="p-6 min-h-screen bg-transparent">
      <h1 className="text-2xl font-bold mb-4 text-white">Daily Items For Today</h1>

      {/* Preferences Toggle */}
      <Button
        onClick={() => setShowPreferences(!showPreferences)}
        className="bg-blue-500 text-white p-2 rounded-md mb-4"
      >
        {showPreferences ? "Hide Preferences" : "Show Preferences"}
      </Button>

      {/* Preferences Box */}
      {showPreferences && (Preferences({ showPreferences, locations, visibleLocations, toggleLocationVisibility, timesOfDay, visibleTimes, toggleTimeVisibility })
      )}

      {/* Search Input */}
      <Input
        type="text"
        placeholder="Search for an item..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-gray-800 text-white"
      />

      {/* LocationItem Grid */}
      <LocationItemGrid
        locations={locations}
        visibleLocations={visibleLocations}
        timesOfDay={timesOfDay}
        visibleTimes={visibleTimes}
        filteredItems={filteredItems}
        favorites={favorites}
        handleItemClick={handleItemClick}
      />
    </div>
  );
};

export default DailyItems;

