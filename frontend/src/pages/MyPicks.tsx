import React, { useState, useEffect } from "react";
import { Tab } from "@headlessui/react";
import { useAuth } from "../context/AuthProvider";
// grab router for navigation
import { useNavigate } from 'react-router-dom';
import { fetchAllData } from "../util/data";

type DailyItem = {
  Name: string;
  description: string;
  Date: string;
  Location: string;
  TimeOfDay: string;
};

const MyPicks: React.FC = () => {
  const [groupedItems, setGroupedItems] = useState<Record<string, DailyItem[]>>({}); // New state for grouped items
  const [locations, setLocations] = useState<string[]>([]); // New state for locations

  const [noItemsMessage, setNoItemsMessage] = useState<string | null>(null); // New state for message
  const { user, authLoading, token } = useAuth()
  const userName = user?.displayName || '';
  const navigate = useNavigate();

  // Fetch dailyItems based on the userID
  const getFavoriteDailyItems = async () => {
    try {
      if (!token) {
        const userConfirmed = window.confirm(
          "You're not signed in to access this page. Would you like to login?"
        );

        if (userConfirmed) {
          navigate('/login');
        }
        return;
      };  // Ensure we have a valid userId before fetching

      const data = await fetchAllData(token);
      const availableFavorites = data.availableFavorites;

      if (!availableFavorites || availableFavorites.length === 0) {
        setNoItemsMessage("None of your preferences are available today. \r Consider checking out the daily items today!");
      } else {
        setNoItemsMessage(null); // Reset message if items are available

        // Group the items by location after dailyItems has been set
        const groupedItems = groupByLocation(availableFavorites);
        setGroupedItems(groupedItems);
        setLocations(Object.keys(groupedItems));
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  // Group items by Location
  const groupByLocation = (items: DailyItem[]) => {
    return items.reduce((acc: Record<string, DailyItem[]>, item: DailyItem) => {
      if (!acc[item.Location]) {
        acc[item.Location] = [];
      }
      acc[item.Location].push(item);
      return acc;
    }, {});
  };



  useEffect(() => {
    if (!authLoading) {
      getFavoriteDailyItems();
    }
  }, [authLoading]);  // Re-run when authLoading changes or we get a new userId


  return (
    <div className="container mx-auto p-6 bg-white text-black dark:bg-zinc-900 dark:text-white transition-colors duration-200">
      {noItemsMessage ? (
        <p className="text-lg font-semibold">{noItemsMessage}</p>
      ) : (
        locations.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Daily Items for {userName}</h3>

            <Tab.Group>
              <Tab.List className="flex space-x-2 border-b-2 border-gray-200 dark:border-gray-700">
                {locations.map((location) => (
                  <Tab
                    key={location}
                    className={({ selected }) =>
                      selected
                        ? "px-4 py-2 text-blue-500 border-b-2 border-blue-500"
                        : "px-4 py-2 text-gray-800 dark:text-gray-300"
                    }
                  >
                    {location}
                  </Tab>
                ))}
              </Tab.List>

              <Tab.Panels className="mt-6">
                {locations.map((location) => (
                  <Tab.Panel key={location}>
                    <h4 className="text-lg font-medium mb-4">Items for Location: {location}</h4>
                    <ul className="space-y-4">
                      {groupedItems[location].map((item, index) => (
                        <li
                          key={index}
                          className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 transition-colors duration-200"
                        >
                          <strong className="text-lg">{item.Name}</strong>
                          <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Time of Day: {item.TimeOfDay}</p>
                        </li>
                      ))}
                    </ul>
                  </Tab.Panel>
                ))}
              </Tab.Panels>
            </Tab.Group>
          </div>
        )
      )}
    </div>
  );
};

export default MyPicks;
