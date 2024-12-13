import React from 'react';
import { Link } from 'react-router-dom';

interface AuthPopupProps {
  onClose: () => void;
}

const AuthPopup: React.FC<AuthPopupProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      aria-labelledby="auth-popup-title"
      aria-describedby="auth-popup-description"
      role="dialog"
    >
      <div
        className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center w-96"
        role="document"
      >
        <h2
          id="auth-popup-title"
          className="text-lg font-bold text-white mb-4"
        >
          Not Signed In
        </h2>

        <p
          id="auth-popup-description"
          className="text-sm text-gray-400 mb-6"
        >
          You need to log in to add this item to your favorites.
        </p>

        <div className="flex justify-center items-center gap-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            Dismiss
          </button>
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPopup;
