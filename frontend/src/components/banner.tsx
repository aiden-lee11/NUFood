import React, { useState } from 'react';

const Banner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-1/2 mx-auto text-center h-[30px] bg-white-100 dark:bg-blue">
      <span className="text-black font-bold dark:bg-blue dark:text-white text-lg">
        Click on an item to add it to your favorites!
      </span>
      <button
        onClick={handleClose}
        className="text-black dark:text-white font-bold dark:bg-blue text-md focus:outline-none mx-2"
        aria-label="Close banner"
        style={{ backgroundColor: 'transparent' }}
      >
        ✕
      </button>
    </div>
  );
};

export default Banner;
