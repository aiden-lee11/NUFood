import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useState } from 'react';

const SignOutButton = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    sessionStorage.removeItem('allItems');
    sessionStorage.removeItem('availableFavorites');
    sessionStorage.removeItem('dailyItems');
    sessionStorage.removeItem('date');
    sessionStorage.removeItem('userPreferences');
    sessionStorage.removeItem('auth');

    setLoading(true);
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center mt-12">
      <h2 className="text-white text-xl mb-4">Are you sure you want to sign out?</h2>
      <button
        onClick={handleSignOut}
        className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 transition duration-300"
      >
        {loading ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
};

export default SignOutButton;
