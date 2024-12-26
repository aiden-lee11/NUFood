import React, { useState, useEffect } from "react";
import { Hour } from "../types/OperationTypes";

type StatusProps = {
  hours: Hour | null;
};

const Status: React.FC<StatusProps> = ({ hours }) => {
  if (hours == null) {
    return <div className="text-red-500">Status -- Closed</div>;
  }

  const [remainingTime, setRemainingTime] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Helper function to convert Hour data into a Date object
  const getEndDateTime = (): Date => {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate.setHours(parseInt(hours.EndHour, 10), parseInt(hours.EndMinutes, 10), 0);
    return endDate;
  };

  const calculateRemainingTime = () => {
    const now = new Date();
    const endDateTime = getEndDateTime();
    const diffMs = endDateTime.getTime() - now.getTime();

    if (diffMs <= 0) {
      setIsOpen(false); // It's closed
      return "Closed";
    }

    setIsOpen(true); // It's open
    const diffMins = Math.floor(diffMs / 60000); // Minutes
    const hours = Math.floor(diffMins / 60); // Hours
    const minutes = diffMins % 60; // Remaining minutes

    return hours > 0
      ? `${hours} hr${hours > 1 ? "s" : ""} ${minutes} min${minutes !== 1 ? "s" : ""}`
      : `${minutes} min${minutes !== 1 ? "s" : ""}`;
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
  }, [hours]);

  return (
    <div className={isOpen ? "text-green-500" : "text-red-500"}>
      Status -- {isOpen ? `Closes in ${remainingTime}` : "Closed"}
    </div>
  );
};

export default Status;
