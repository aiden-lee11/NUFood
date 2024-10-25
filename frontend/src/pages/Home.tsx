import React, { useState, useEffect } from "react";
import { Tab } from "@headlessui/react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
// grab router for navigation
import { useNavigate } from 'react-router-dom';

type DailyItem = {
  Name: string;
  description: string;
  Date: string;
  Location: string;
  TimeOfDay: string;
};

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const Home: React.FC = () => {
  const [groupedItems, setGroupedItems] = useState<Record<string, DailyItem[]>>({}); // New state for grouped items
  const [locations, setLocations] = useState<string[]>([]); // New state for locations

  const [noItemsMessage, setNoItemsMessage] = useState<string | null>(null); // New state for message
  const [user, authLoading] = useAuthState(auth); // authLoading shows whether Firebase is loading
  const userId = user?.uid || '';
  const userName = user?.displayName || '';
  const navigate = useNavigate();

  // Fetch dailyItems based on the userID
  const getFavoriteDailyItems = async () => {
    try {
      if (!userId) {
        console.error("User ID not found. Redirecting to login.");
        // Redirect to login page if no user is found
        navigate('/login');

      };  // Ensure we have a valid userId before fetching
      const response = await fetch(`${API_URL}/api/favorites?userID=${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.error("Favorites not found for the user. Redirecting to favorite assignment.");
          // Redirect to favorite assignment page if no favorites are found
          navigate('/favorites');
        } else {
          console.error("Error fetching favorites:", response.statusText);
        }
        return;
      }

      const data = await response.json();
      console.log("Favorites fetched successfully:", data);

      if (!data || data.length === 0) {
        setNoItemsMessage("None of your preferences are available today. \r Consider checking out the daily items today!");
      } else {
        setNoItemsMessage(null); // Reset message if items are available

        // Group the items by location after dailyItems has been set
        const groupedItems = groupByLocation(data);
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
    // Only fetch dailyItems if Firebase auth is not loading and we have a valid user
    if (!authLoading && userId) {
      getFavoriteDailyItems();
    }
  }, [authLoading, userId]);  // Re-run when authLoading changes or we get a new userId

  if (!userId) {
    console.error("User ID not found. Redirecting to login.");
    // Redirect to login page if no user is found
    navigate('/login');
  }

  return (
    <div className="container mx-auto p-6">
      {noItemsMessage ? (
        <p className="text-white text-lg font-semibold">{noItemsMessage}</p> // Display the message
      ) : (
        locations.length > 0 && (
          <div className="mt-8">
            <h3 className="text-white text-lg font-semibold mb-4">Daily Items for {userName}</h3>

            <Tab.Group>
              <Tab.List className="text-white flex space-x-2 border-b-2 border-gray-200">
                {locations.map((location) => (
                  <Tab
                    key={location}
                    className={({ selected }) =>
                      selected
                        ? "px-4 py-2 text-blue-500 border-b-2 border-blue-500"
                        : "px-4 py-2 text-white"
                    }
                  >
                    {location}
                  </Tab>
                ))}
              </Tab.List>

              <Tab.Panels className="mt-6">
                {locations.map((location) => (
                  <Tab.Panel key={location}>
                    <h4 className="text-white text-lg font-medium mb-4">Items for Location: {location}</h4>
                    <ul className="space-y-4">
                      {groupedItems[location].map((item, index) => (
                        <li
                          key={index}
                          className="p-4 border border-gray-300 rounded-lg bg-gray-50"
                        >
                          <strong className="text-lg">{item.Name}</strong>
                          <p className="text-gray-600">{item.description}</p>
                          <p className="text-sm text-gray-500">Time of Day: {item.TimeOfDay}</p>
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
    </div >
  );
};

export default Home;
