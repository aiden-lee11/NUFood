import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { fetchUserPreferences } from '../util/userPreferences';
import { useNavigate } from 'react-router-dom';

interface FavoriteItem {
  Name: string;
}

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [user, authLoading] = useAuthState(auth);
  const userId = user?.uid || '';
  const navigate = useNavigate();

  // Fetch user favorites based on userID
  const fetchFavorites = async () => {
    const favorites = await fetchUserPreferences(userId);
    setFavorites(favorites.map((item: FavoriteItem) => item));
  };

  useEffect(() => {
    if (!authLoading && userId) {
      fetchFavorites();
    }
  }, [authLoading, userId]);


  if (!userId) {
    console.error("User ID not found. Redirecting to login.");
    // Redirect to login page if no user is found
    navigate('/login');
  }

  return (
    <div className="p-6 min-h-screen bg-transparent">
      <h1 className="text-2xl font-bold mb-4 text-white">Your Favorite Items</h1>

      {favorites.length > 0 ? (
        <ul className="space-y-2">
          {favorites.map((item, index) => (
            <li key={index} className="p-3 rounded-md bg-gray-800 text-white">
              {item.Name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-white">You have no favorite items yet.</p>
      )}
    </div>
  );
};

export default FavoritesPage;
