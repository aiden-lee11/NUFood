import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const Scrape: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true); // Set loading to true initially

  useEffect(() => {
    // Async function to handle the fetch
    const fetchDailyItems = async () => {
      try {
        const response = await fetch(`${API_URL}/api/scrapeDailyItems`);
        if (!response.ok) {
          console.error("Error fetching daily items:", response.statusText);
          return;
        }
        setSuccess(true);
      } catch (error) {
        console.error("Error fetching daily items:", error);
      } finally {
        setLoading(false); // Stop loading whether it's successful or an error
      }
    };

    fetchDailyItems(); // Call the function
  }, []); // Empty dependency array to run this only on mount

  return (
    <div>
      {loading ? (
        <div className='text-white'>Loading...</div>
      ) : success ? (
        <div className='text-white'>Scrape Successful</div>
      ) : (
        <div className='text-white'>Error in fetching items</div>
      )}
    </div>
  );
};

export default Scrape;
