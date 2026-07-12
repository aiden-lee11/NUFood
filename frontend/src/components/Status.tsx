import React, { useState, useEffect } from "react";
import { LocationOperatingTimes } from "../types/OperationTypes";
import { getCentralNow } from "../util/helper";

// Format a minutes-since-midnight value (may exceed 1440 for times past midnight) to "h:mm AM/PM".
const formatMinutesToAmPm = (totalMinutes: number): string => {
  const dayMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  let hours = Math.floor(dayMinutes / 60);
  const minutes = dayMinutes % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // convert 0 to 12
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
};

const Status: React.FC<LocationOperatingTimes> = ({ operatingTimes }) => {
  // Always call hooks at the top.
  const [statusText, setStatusText] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Early out for invalid operatingTimes can be handled in the render.
  useEffect(() => {
    if (!operatingTimes || typeof operatingTimes === "string") {
      return; // Skip setting up interval if data is invalid.
    }

    const calculateStatus = () => {
      // Compare minutes-since-midnight in Central time rather than device-local Date objects.
      const { hours, minutes } = getCentralNow();
      const nowMinutes = hours * 60 + minutes;
      let nextOpenMinutes: number | null = null;
      let nextCloseMinutes: number | null = null;
      let currentlyOpen = false;

      operatingTimes.forEach(({ StartHour, StartMinutes, EndHour, EndMinutes }) => {
        // Handle both string and number types for backward compatibility
        const startHour = typeof StartHour === 'string' ? parseInt(StartHour, 10) : StartHour;
        const startMinutes = typeof StartMinutes === 'string' ? parseInt(StartMinutes, 10) : StartMinutes;
        const endHour = typeof EndHour === 'string' ? parseInt(EndHour, 10) : EndHour;
        const endMinutes = typeof EndMinutes === 'string' ? parseInt(EndMinutes, 10) : EndMinutes;

        const start = startHour * 60 + startMinutes;
        let end = endHour * 60 + endMinutes;

        // if end ≤ start, assume closing after midnight
        if (end <= start) {
          end += 1440;
        }

        if (nowMinutes >= start && nowMinutes < end) {
          currentlyOpen = true;
          if (nextCloseMinutes === null || end < nextCloseMinutes) {
            nextCloseMinutes = end;
          }
        } else if (nowMinutes < start) {
          if (nextOpenMinutes === null || start < nextOpenMinutes) {
            nextOpenMinutes = start;
          }
        }
      });

      if (currentlyOpen) {
        setIsOpen(true);
        if (nextCloseMinutes !== null) {
          const diffMins = nextCloseMinutes - nowMinutes;
          return diffMins < 60
            ? `Closes in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`
            : `Open until ${formatMinutesToAmPm(nextCloseMinutes)}`;
        }
      } else {
        setIsOpen(false);
        if (nextOpenMinutes !== null) {
          const diffMins = nextOpenMinutes - nowMinutes;
          return diffMins < 60
            ? `Opens in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`
            : `Closed until ${formatMinutesToAmPm(nextOpenMinutes)}`;
        }
      }

      return "Closed";
    };

    // Initial calculation and then update every minute.
    setStatusText(calculateStatus());
    const intervalId = setInterval(() => {
      setStatusText(calculateStatus());
    }, 60000);

    return () => clearInterval(intervalId);
  }, [operatingTimes]);

  // Conditional rendering based on operatingTimes.
  if (!operatingTimes || (typeof operatingTimes === "string" && operatingTimes === "closed")) {
    return <div className="text-red-500">Status -- Closed</div>;
  }
  if (typeof operatingTimes === "string") {
    return <div className="text-yellow-500">Status -- Invalid Data</div>;
  }

  return (
    <div className={isOpen ? "text-green-500" : "text-red-500"}>
      Status -- {statusText}
    </div>
  );
};

export default Status;
