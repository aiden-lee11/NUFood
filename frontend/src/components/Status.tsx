import React, { useState, useEffect } from "react";
import { locationToHours } from "../types/OperationTypes";


const Status: React.FC<locationToHours> = ({ operatingTimes }) => {
  if (!operatingTimes || (typeof operatingTimes === "string" && operatingTimes === "closed")) {
    return <div className="text-red-500">Status -- Closed</div>;
  }

  if (typeof operatingTimes === "string") {
    return <div className="text-yellow-500">Status -- Invalid Data</div>;
  }

  const [remainingTime, setRemainingTime] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const calculateRemainingTime = () => {
    const now = new Date();
    let nextOpenTime: Date | null = null;
    let nextCloseTime: Date | null = null;
    let currentlyOpen = false;

    operatingTimes.forEach(({ StartHour, StartMinutes, EndHour, EndMinutes }) => {
      const start = new Date();
      const end = new Date();
      start.setHours(parseInt(StartHour, 10), parseInt(StartMinutes, 10), 0);
      end.setHours(parseInt(EndHour, 10), parseInt(EndMinutes, 10), 0);

      if (now >= start && now < end) {
        // The current time is within this range
        currentlyOpen = true;
        if (!nextCloseTime || end < nextCloseTime) {
          nextCloseTime = end;
        }
      } else if (now < start) {
        // The current time is before this range
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
        const hours = Math.floor(diffMins / 60);
        const minutes = diffMins % 60;

        return hours > 0
          ? `Closes in ${hours} hr${hours > 1 ? "s" : ""} ${minutes} min${minutes !== 1 ? "s" : ""}`
          : `Closes in ${minutes} min${minutes !== 1 ? "s" : ""}`;
      }
    } else {
      setIsOpen(false);
      if (nextOpenTime) {
        const diffMs = (nextOpenTime as Date).getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const minutes = diffMins % 60;

        return hours > 0
          ? `Opens in ${hours} hr${hours > 1 ? "s" : ""} ${minutes} min${minutes !== 1 ? "s" : ""}`
          : `Opens in ${minutes} min${minutes !== 1 ? "s" : ""}`;
      }
    }

    return "Closed";
  };

  useEffect(() => {
    // Initial calculation
    setRemainingTime(calculateRemainingTime());

    // Update every minute
    const intervalId = setInterval(() => {
      setRemainingTime(calculateRemainingTime());
    }, 60000);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [operatingTimes]);

  return (
    <div className={isOpen ? "text-green-500" : "text-red-500"}>
      Status -- {remainingTime}
    </div>
  );
};

export default Status
