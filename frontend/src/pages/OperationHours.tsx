// components/OperationHours.tsx
import React, { useState, useEffect } from "react";
import { getWeekday, formatTime, locationAliases } from "../util/helper";
import { OperationHoursData, OperatingTime } from "../types/OperationTypes";
import { useDataStore } from "@/store";
import SEO from '../components/SEO';
import { ColumnDividerOverlay } from '../components/Table';
import { DatePicker } from '../components/calendar';

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
    "Forno Pizza Co.",
    "The Market at Norris",
  ],
  "Retail Dining": [
    "Protein Bar",
    "847 at Fran's Cafe",
    "Tech Express",
    "Backlot at Kresge Cafe",
    "Cafe Coralie",
    "Lisa's Cafe",
    // seems like this is just not a thing tracked by api anymore?
    // 9/15/25
    // "Café Bergson", 
  ],
};

const OperationHours: React.FC = () => {
  const rawData: OperationHoursData[] = useDataStore(
    (s) => s.UserDataResponse.locationOperationHours
  );

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // grab days header from the first available entry
  const weekDays = rawData[0]?.Week || [];
  const toLocalISODate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const parseLocalYYYYMMDD = (s: string) => {
    const [y, m, d] = s.split('-').map((n: string) => parseInt(n, 10));
    return new Date(y, (m as number) - 1, d);
  };
  const selectedDateStr = toLocalISODate(selectedDate);
  let selectedDayIndex = weekDays.findIndex((d: any) => d.Date === selectedDateStr);
  if (selectedDayIndex < 0) {
    // Fallback to day-of-week index if date string mismatch due to TZ
    const dow = selectedDate.getDay(); // 0 (Sun) - 6 (Sat)
    selectedDayIndex = weekDays.findIndex((d: any) => parseInt(d.Day, 10) === dow);
    if (selectedDayIndex < 0) selectedDayIndex = 0;
  }

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
  const getOperatingTimeRange = (shortNames: string[], dayIndex: number) => {
    if (dayIndex == null || dayIndex < 0) {
      return { startHour: 8, endHour: 17 };
    }
    let minHour = 24;
    let maxHour = 0;

    shortNames.forEach(shortName => {
      const loc = findByAlias(shortName);
      if (loc && loc.Week[dayIndex]?.Hours && loc.Week[dayIndex].Status !== "closed") {
        const dayHours = loc.Week[dayIndex].Hours;
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
    if (dayIndex == null || dayIndex < 0) return { isOpen: false, topHalf: false, bottomHalf: false };
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
    <div className="p-6 min-h-screen bg-background">
      <SEO
        title="Dining Hours - NUFood"
        description="Check current operating hours for all Northwestern University dining locations. Find out when your favorite campus restaurants and dining halls are open."
        keywords="Northwestern dining hours, NU restaurant hours, campus dining schedule, Northwestern food hours"
        url="https://nufood.me/hours"
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dining Hours</h1>
        <DatePicker
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          // Limit to the Sunday→Saturday range of the loaded dataset
          minDate={weekDays.length ? parseLocalYYYYMMDD(weekDays[0].Date) : undefined}
          maxDate={weekDays.length ? parseLocalYYYYMMDD(weekDays[weekDays.length - 1].Date) : undefined}
        />
      </div>
      <div>
        {Object.entries(locationGrouping).map(([groupName, shortNames]) => {
          // Calculate time range for this specific category
          const { startHour, endHour } = getOperatingTimeRange(shortNames, selectedDayIndex);
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
                          <div key={timeSlot.hour} className="grid border-b-2 border-border hover:bg-muted/30 transition-colors relative" style={{ gridTemplateColumns: `80px repeat(${shortNames.length}, minmax(150px, 1fr))` }}>
                            {/* Time label */}
                            <div className="p-3 text-sm font-medium text-card-foreground border-r-2 border-border bg-card/70">
                              {timeSlot.label}
                            </div>

                            {/* Column dividers overlayed above content; left gutter = 80px */}
                            <ColumnDividerOverlay columns={shortNames.length} leftGutterPx={80} className="z-10" />

                            {/* Location status cells */}
                            {shortNames.map((shortName, index) => {
                              const { topHalf, bottomHalf } = getLocationTimeInfo(shortName, timeSlot.hour, selectedDayIndex);

                              // Check if previous/next locations and time slots are open for continuous appearance
                              const prevLocationInfo = index > 0
                                ? getLocationTimeInfo(shortNames[index - 1], timeSlot.hour, selectedDayIndex)
                                : { isOpen: false, topHalf: false, bottomHalf: false };

                              // Check if previous/next time slots are also open for continuous appearance
                              const currentSlotIndex = timeSlots.findIndex(slot => slot.hour === timeSlot.hour);
                              const prevTimeSlotInfo = currentSlotIndex > 0
                                ? getLocationTimeInfo(shortName, timeSlots[currentSlotIndex - 1].hour, selectedDayIndex)
                                : { isOpen: false, topHalf: false, bottomHalf: false };
                              const nextTimeSlotInfo = currentSlotIndex < timeSlots.length - 1
                                ? getLocationTimeInfo(shortName, timeSlots[currentSlotIndex + 1].hour, selectedDayIndex)
                                : { isOpen: false, topHalf: false, bottomHalf: false };

                              const shouldExtendUp = prevTimeSlotInfo.isOpen && prevTimeSlotInfo.bottomHalf && topHalf;
                              const shouldExtendDown = nextTimeSlotInfo.isOpen && nextTimeSlotInfo.topHalf && bottomHalf;

                              return (
                                <div
                                  key={shortName}
                                  className="relative"
                                  style={{ minHeight: '48px' }}
                                >
                                  {/* Top half (first 30 minutes) */}
                                  {topHalf && (
                                    <div
                                      className="bg-green-600 absolute left-0 z-20"
                                      style={{
                                        top: shouldExtendUp ? '-2px' : '0',
                                        height: shouldExtendUp ? 'calc(50% + 2px)' : '50%',
                                        width: '100%',
                                        // Outer-border for contiguous block (top-half)
                                        borderStyle: 'solid',
                                        borderColor: 'hsl(var(--accent))',
                                        borderTopWidth: (!prevTimeSlotInfo.bottomHalf) ? 2 : 0,
                                        borderLeftWidth: (!prevLocationInfo.topHalf) ? 2 : 0,
                                        borderRightWidth: 2,
                                        borderRightColor: 'hsl(var(--accent))',
                                        borderBottomWidth: (!bottomHalf) ? 2 : 0,
                                      }}
                                    />
                                  )}

                                  {/* Bottom half (last 30 minutes) */}
                                  {bottomHalf && (
                                    <div
                                      className="bg-green-600 absolute left-0 z-20"
                                      style={{
                                        bottom: shouldExtendDown ? '-2px' : '0',
                                        height: shouldExtendDown ? 'calc(50% + 2px)' : '50%',
                                        width: '100%',
                                        // Outer-border for contiguous block (bottom-half)
                                        borderStyle: 'solid',
                                        borderColor: 'hsl(var(--accent))',
                                        borderTopWidth: (!topHalf) ? 2 : 0,
                                        borderLeftWidth: (!prevLocationInfo.bottomHalf) ? 2 : 0,
                                        borderRightWidth: 2,
                                        borderRightColor: 'hsl(var(--accent))',
                                        borderBottomWidth: (!nextTimeSlotInfo.topHalf) ? 2 : 0,
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
                  const dayToShow = (loc?.Week || []).find((d: any) => d.Date === selectedDateStr);
                  return (
                    <div
                      key={shortName}
                      className="p-4 border-2 border-border rounded-lg shadow-md bg-card hover:shadow-lg transition-shadow"
                    >
                      <h3 className="text-lg font-semibold mb-3 text-primary border-b border-border pb-1">
                        {shortName}
                      </h3>
                      <div className="flex justify-between text-sm border-t border-border/50 pt-2 mt-2">
                        <span className="font-medium text-card-foreground">
                          {getWeekday(selectedDate.getDay())}
                        </span>
                        <span className={dayToShow && dayToShow.Status !== "closed" ? "text-primary font-medium" : "text-destructive font-medium"}>
                          {!dayToShow || dayToShow.Status === "closed" ? "Closed" : renderHours(dayToShow.Hours)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OperationHours;
