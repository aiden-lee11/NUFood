import React, { useState, useEffect } from "react";
import { LocationOperatingTimes } from "../types/OperationTypes";

const formatTimeToAmPm = (date: Date): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
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
      const now = new Date();
      let nextOpenTime: Date | null = null;
      let nextCloseTime: Date | null = null;
      let currentlyOpen = false;

      operatingTimes.forEach(({ StartHour, StartMinutes, EndHour, EndMinutes }) => {
        const start = new Date();
        const end = new Date();
        start.setHours(parseInt(StartHour, 10), parseInt(StartMinutes, 10), 0);
        end.setHours(parseInt(EndHour, 10), parseInt(EndMinutes, 10), 0);

        // if end ≤ start, assume closing after midnight
        if (end.getTime() <= start.getTime()) {
          end.setDate(end.getDate() + 1)
        }

        if (now >= start && now < end) {
          currentlyOpen = true;
          if (!nextCloseTime || end < nextCloseTime) {
            nextCloseTime = end;
          }
        } else if (now < start) {
          if (!nextOpenTime || start < nextOpenTime) {
            nextOpenTime = start;
          }
        }
      });

      if (currentlyOpen) {
        setIsOpen(true);
        if (nextCloseTime) {
          const diffMs = (nextCloseTime as Date).getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          return diffMins < 60
            ? `Closes in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`
            : `Open until ${formatTimeToAmPm(nextCloseTime)}`;
        }
      } else {
        setIsOpen(false);
        if (nextOpenTime) {
          const diffMs = (nextOpenTime as Date).getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          return diffMins < 60
            ? `Opens in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`
            : `Closed until ${formatTimeToAmPm(nextOpenTime)}`;
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
