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
    <div ref={containerRef} className="w-full mx-auto text-center h-[30px] bg-background">
      <span className="text-foreground font-bold text-md">
        Click an item to favorite it!
      </span>
      <button
        onClick={handleClose}
        className="text-foreground font-bold bg-background text-sm focus:outline-none mx-2"
        aria-label="Close banner"
        style={{ backgroundColor: 'transparent' }}
      >
        ✕
      </button>
    </div>
  );
};

export default Banner;
