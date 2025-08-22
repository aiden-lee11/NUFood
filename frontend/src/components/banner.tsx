import React, { useState } from 'react';
import { useLocation } from 'react-router-dom'
import { useBanner } from '@/context/BannerContext';

const Banner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const location = useLocation();
  const { containerRef } = useBanner();

  const handleClose = () => {
    setIsVisible(false);
  };

  const noShow = ["/preferences", "/hours", "/planner"];
  if (!isVisible || noShow.includes(location.pathname)) {
    return null;
  }

  return (
    <div ref={containerRef} className="w-full mx-auto bg-secondary/30 border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 md:py-2">
        <span className="text-foreground font-medium text-sm md:text-base flex-1 text-center">
          Click an item to favorite it!
        </span>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-lg md:text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 rounded p-1 ml-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="Close banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Banner;
