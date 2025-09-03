// components/OperationHours.tsx
import React, { useState, useEffect } from "react";
import { getWeekday, formatTime, locationAliases } from "../util/helper";
import { OperationHoursData, OperatingTime } from "../types/OperationTypes";
import { useDataStore } from "@/store";

type LocationGrouping = { [category: string]: string[] };

const locationGrouping: LocationGrouping = {
  "Dining Commons": ["Allison", "Sargent", "Plex East", "Plex West", "Elder"],
  "Norris Center": [
    "847 Burger",
    "Buen Dia",
    "Shake Smart",
    "Chicken & Boba",
    "Wildcat Deli",
    "Starbucks",
    "MOD Pizza",
    "Market at Norris",
  ],
  "Retail Dining": [
    "Protein Bar",
    "847 Late Night at Fran's",
    "Tech Express",
    "Backlot at Kresge Cafe",
    "Cafe Coralie",
    "Lisa's Cafe",
    "Café Bergson",
  ],
};

const OperationHours: React.FC = () => {
  const rawData: OperationHoursData[] = useDataStore(
    (s) => s.UserDataResponse.locationOperationHours
  );
  
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // grab days header from the first available entry
  const weekDays = rawData[0]?.Week || [];

  // helper: given a shortName, find the actual payload entry
  const findByAlias = (shortName: string) => {
    const aliases = locationAliases[shortName] || [shortName];
    return rawData.find((d) => aliases.includes(d.Name));
  };

  // helper to render one day's hours
  const renderHours = (hours: OperatingTime[] | null) =>
    !hours
      ? "Closed"
      : hours.map((h, i) => (
        <span key={i}>
          {formatTime(h.StartHour, h.StartMinutes)} –{" "}
          {formatTime(h.EndHour, h.EndMinutes)}
          <br />
        </span>
      ));

  // Get min/max operating hours for a set of locations
  const getOperatingTimeRange = (shortNames: string[]) => {
    const todayIndex = new Date().getDay();
    let minHour = 24;
    let maxHour = 0;

    shortNames.forEach(shortName => {
      const loc = findByAlias(shortName);
      if (loc && loc.Week[todayIndex]?.Hours && loc.Week[todayIndex].Status !== "closed") {
        const dayHours = loc.Week[todayIndex].Hours;
        dayHours.forEach(({ StartHour, EndHour }) => {
          const startHour = typeof StartHour === 'string' ? parseInt(StartHour, 10) : StartHour;
          const endHour = typeof EndHour === 'string' ? parseInt(EndHour, 10) : EndHour;
          
          minHour = Math.min(minHour, startHour);
          
          // Handle midnight crossover (e.g., closes at 1 AM = hour 1)
          if (endHour < startHour) {
            maxHour = Math.max(maxHour, endHour + 24);
          } else {
            maxHour = Math.max(maxHour, endHour);
          }
        });
      }
    });

    // Add 1 hour buffer before and after, with bounds checking
    let startHour = Math.max(0, minHour - 1);
    let endHour = Math.min(25, maxHour + 1); // 25 = 1 AM next day

    // Ensure we always show at least 8 AM to 5 PM (minimum business hours)
    if (minHour === 24) {
      // No locations have hours, show default range
      startHour = 8;  // 8 AM
      endHour = 17;   // 5 PM
    } else {
      // Expand range to include 8 AM - 5 PM if needed
      startHour = Math.min(startHour, 8);   // Start no later than 8 AM
      endHour = Math.max(endHour, 17);      // End no earlier than 5 PM
    }

    return { startHour, endHour };
  };

  // Generate time slots for specific hour range
  const generateTimeSlotsForRange = (startHour: number, endHour: number) => {
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const displayHour = hour >= 24 ? hour - 24 : hour;
      
      if (displayHour === 0) {
        slots.push({ hour: displayHour, label: "12AM", display: "12:00 AM" });
      } else if (displayHour === 12) {
        slots.push({ hour: displayHour, label: "12PM", display: "12:00 PM" });
      } else if (displayHour > 12) {
        slots.push({ hour: displayHour, label: `${displayHour - 12}PM`, display: `${displayHour - 12}:00 PM` });
      } else {
        slots.push({ hour: displayHour, label: `${displayHour}AM`, display: `${displayHour}:00 AM` });
      }
    }
    return slots;
  };

  // Check if a location is open at a specific time slot and return vertical coverage info
  const getLocationTimeInfo = (shortName: string, timeSlot: number, dayIndex: number) => {
    const loc = findByAlias(shortName);
    if (!loc || !loc.Week[dayIndex]?.Hours) return { isOpen: false, topHalf: false, bottomHalf: false };

    const dayHours = loc.Week[dayIndex].Hours;
    if (!dayHours || loc.Week[dayIndex].Status === "closed") return { isOpen: false, topHalf: false, bottomHalf: false };

    let topHalf = false;
    let bottomHalf = false;

    dayHours.forEach(({ StartHour, StartMinutes, EndHour, EndMinutes }) => {
      // Convert to numbers and then to minutes since midnight for easier calculations
      const startHour = typeof StartHour === 'string' ? parseInt(StartHour, 10) : StartHour;
      const startMinutes = typeof StartMinutes === 'string' ? parseInt(StartMinutes, 10) : StartMinutes;
      const endHour = typeof EndHour === 'string' ? parseInt(EndHour, 10) : EndHour;
      const endMinutes = typeof EndMinutes === 'string' ? parseInt(EndMinutes, 10) : EndMinutes;
      
      const startTime = startHour * 60 + startMinutes;
      const endTime = endHour * 60 + endMinutes;
      
      // Time slot covers: timeSlot:00 to (timeSlot+1):00
      const slotStart = timeSlot * 60;
      const slotEnd = (timeSlot + 1) * 60;
      const slotMiddle = timeSlot * 60 + 30;
      
      // Handle midnight crossover
      if (endTime < startTime) {
        // Crosses midnight - check if timeSlot is in either part
        const inFirstPart = slotStart >= startTime;
        const inSecondPart = slotEnd <= endTime;
        
        if (inFirstPart || inSecondPart) {
          // Top half: timeSlot:00 to timeSlot:30
          if (inFirstPart) {
            topHalf = true;
            bottomHalf = true; // Assumes it continues past 30min if it starts in this slot
          } else if (inSecondPart) {
            // Check if it covers the halves
            if (endTime >= slotMiddle) {
              topHalf = true;
              if (endTime >= slotEnd) bottomHalf = true;
            }
          }
        }
      } else {
        // Normal case - check overlap with time slot
        if (startTime < slotEnd && endTime > slotStart) {
          // There's an overlap, now check which halves
          
          // Top half: timeSlot:00 to timeSlot:30
          if (startTime < slotMiddle && endTime > slotStart) {
            topHalf = true;
          }
          
          // Bottom half: timeSlot:30 to (timeSlot+1):00  
          if (startTime < slotEnd && endTime > slotMiddle) {
            bottomHalf = true;
          }
        }
      }
    });

    const isOpen = topHalf || bottomHalf;
    return { isOpen, topHalf, bottomHalf };
  };

  // Note: timeSlots and currentTimePosition are now calculated per category

  return (
    <div>
      {Object.entries(locationGrouping).map(([groupName, shortNames]) => {
        // Calculate time range for this specific category
        const { startHour, endHour } = getOperatingTimeRange(shortNames);
        const timeSlots = generateTimeSlotsForRange(startHour, endHour);
        
        // Calculate current time position for this category's time range
        const getCurrentTimePositionForRange = () => {
          const now = currentTime;
          const currentHour = now.getHours();
          const currentMinutes = now.getMinutes();
          
          // Check if current time is within this category's display range
          let adjustedCurrentHour = currentHour;
          if (endHour > 24 && currentHour < 12) {
            // Handle late night hours (like 1-2 AM next day)
            adjustedCurrentHour += 24;
          }
          
          // Only show time indicator if current time is within the range
          if (adjustedCurrentHour < startHour || adjustedCurrentHour >= endHour) {
            return -1; // Signal to hide the time indicator
          }
          
          // Calculate position as percentage within this category's time range
          const totalHours = endHour - startHour;
          const relativeHour = adjustedCurrentHour - startHour;
          
          const relativePosition = (relativeHour + currentMinutes / 60) / totalHours;
          return Math.max(0, Math.min(1, relativePosition)) * 100; // Clamp between 0-100%
        };
        
        const currentTimePosition = getCurrentTimePositionForRange();
        
        return (
        <div key={groupName} className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            {groupName}
          </h2>

          {/* Time-based grid for wide screens */}
          <div className="hidden sm:block">
            <div className="relative bg-card shadow-lg rounded-lg overflow-hidden border border-border">
              {/* Combined header and grid container - both scroll together */}
              <div className="overflow-x-auto">
                <div className="relative" style={{ minWidth: `${80 + shortNames.length * 150}px` }}>
                  {/* Header with location names */}
                  <div className="grid bg-card border-b-2 border-border" style={{ gridTemplateColumns: `80px repeat(${shortNames.length}, minmax(150px, 1fr))` }}>
                    <div className="p-3 font-semibold text-card-foreground border-r-2 border-border">
                      Time
                    </div>
                    {shortNames.map((shortName) => (
                      <div key={shortName} className="px-2 py-3 font-semibold text-card-foreground text-center border-r-2 border-border last:border-r-0 whitespace-nowrap text-sm overflow-hidden">
                        <span className="block truncate" title={shortName}>
                          {shortName}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Time grid container */}
                  <div className="relative">
                    {/* Current time indicator line - only show if current time is in range */}
                    {currentTimePosition >= 0 && (
                      <div 
                        className="absolute left-0 right-0 h-0.5 bg-red-500 z-50 transition-all duration-1000 pointer-events-none"
                        style={{ 
                          top: `${currentTimePosition}%`,
                          boxShadow: '0 0 4px rgba(239, 68, 68, 0.8)'
                        }}
                      />
                    )}

                    {/* Time slots grid */}
                    {timeSlots.map((timeSlot) => (
                      <div key={timeSlot.hour} className="grid border-b-2 border-border hover:bg-muted/30 transition-colors" style={{ gridTemplateColumns: `80px repeat(${shortNames.length}, minmax(150px, 1fr))` }}>
                        {/* Time label */}
                        <div className="p-3 text-sm font-medium text-card-foreground border-r-2 border-border bg-card/70">
                          {timeSlot.label}
                        </div>
                        
                        {/* Location status cells */}
                        {shortNames.map((shortName, index) => {
                          const todayIndex = new Date().getDay();
                          const { isOpen, topHalf, bottomHalf } = getLocationTimeInfo(shortName, timeSlot.hour, todayIndex);
                          
                          // Check if next location is also open for seamless borders
                          const nextLocationInfo = index < shortNames.length - 1 
                            ? getLocationTimeInfo(shortNames[index + 1], timeSlot.hour, todayIndex)
                            : { isOpen: false, topHalf: false, bottomHalf: false };
                          
                          const shouldHideBorder = isOpen && nextLocationInfo.isOpen && 
                            topHalf && bottomHalf && nextLocationInfo.topHalf && nextLocationInfo.bottomHalf;
                          
                          return (
                            <div
                              key={shortName}
                              className="relative"
                              style={{ minHeight: '48px' }}
                            >
                              {/* Border line - hide when both adjacent cells are fully open */}
                              {index < shortNames.length - 1 && !shouldHideBorder && (
                                <div className="absolute top-0 right-0 w-px bg-border/30 h-full z-5" />
                              )}
                              
                              {/* Top half (first 30 minutes) */}
                              {topHalf && (
                                <div 
                                  className="bg-green-600 hover:bg-green-700 transition-colors absolute top-0 left-0 z-10"
                                  style={{
                                    height: '50%',
                                    width: '100%',
                                  }}
                                />
                              )}
                              
                              {/* Bottom half (last 30 minutes) */}
                              {bottomHalf && (
                                <div 
                                  className="bg-green-600 hover:bg-green-700 transition-colors absolute bottom-0 left-0 z-10"
                                  style={{
                                    height: '50%',
                                    width: '100%',
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Cards for small screens */}
          <div className="block sm:hidden space-y-4">
            {shortNames.map((shortName) => {
              const loc = findByAlias(shortName);
              return (
                <div
                  key={shortName}
                  className="p-4 border-2 border-border rounded-lg shadow-md bg-card hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold mb-3 text-primary border-b border-border pb-1">
                    {shortName}
                  </h3>
                  {loc?.Week.map((day) => (
                    <div
                      key={day.Date}
                      className="flex justify-between text-sm border-t border-border/50 pt-2 mt-2"
                    >
                      <span className="font-medium text-card-foreground">
                        {getWeekday(parseInt(day.Day, 10))}
                      </span>
                      <span className={day.Status === "closed" ? "text-destructive font-medium" : "text-primary font-medium"}>
                        {day.Status === "closed"
                          ? "Closed"
                          : renderHours(day.Hours)}
                      </span>
                    </div>
                  )) ||
                    weekDays.map((day) => (
                      <div
                        key={day.Date}
                        className="flex justify-between text-sm border-t border-border/50 pt-2 mt-2"
                      >
                        <span className="font-medium text-card-foreground">
                          {getWeekday(parseInt(day.Day, 10))}
                        </span>
                        <span className="text-destructive font-medium">Closed</span>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default OperationHours;
