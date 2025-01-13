import React, { useState, useEffect } from "react";
import { LocationOperatingTimes } from "../types/OperationTypes";

const formatTimeToAmPm = (date: Date): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // convert 0 to 12
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
};

const Status: React.FC<LocationOperatingTimes> = ({ operatingTimes }) => {
  if (!operatingTimes || (typeof operatingTimes === "string" && operatingTimes === "closed")) {
    return <div className="text-red-500">Status -- Closed</div>;
  }
  if (typeof operatingTimes === "string") {
    return <div className="text-yellow-500">Status -- Invalid Data</div>;
  }

  const [statusText, setStatusText] = useState("");
  const [isOpen, setIsOpen] = useState(false);

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

        if (diffMins < 60) {
          return `Closes in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
        } else {
          return `Open until ${formatTimeToAmPm(nextCloseTime)}`;
        }
      }
    } else {
      setIsOpen(false);
      if (nextOpenTime) {
        const diffMs = (nextOpenTime as Date).getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) {
          return `Opens in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
        } else {
          return `Closed until ${formatTimeToAmPm(nextOpenTime)}`;
        }
      }
    }
    return "Closed";
  };

  useEffect(() => {
    // Initial calculation
    setStatusText(calculateStatus());

    // Update every minute
    const intervalId = setInterval(() => {
      setStatusText(calculateStatus());
    }, 60000);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [operatingTimes]);

  return (
    <div className={isOpen ? "text-green-500" : "text-red-500"}>
      Status -- {statusText}
    </div>
  );
};

export default Status;
