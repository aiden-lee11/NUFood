import React, { useState } from 'react';

const Banner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  const noShow = ["/login", "/signout", "/preferences"]
  if (!isVisible || noShow.includes(window.location.pathname)) {
    return null;
  }

  return (
    <div className="w-full mx-auto text-center h-[30px] bg-white-100 dark:bg-zinc-900 ">
      <span className="text-black font-bold dark:bg-blue dark:text-white text-md">
        Click an item to favorite it!
      </span>
      <button
        onClick={handleClose}
        className="text-black dark:text-white font-bold dark:bg-zing-900 text-sm focus:outline-none mx-2"
        aria-label="Close banner"
        style={{ backgroundColor: 'transparent' }}
      >
        ✕
      </button>
    </div>
  );
};

export default Banner;
