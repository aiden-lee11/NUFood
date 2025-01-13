import React, { useEffect } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import clsx from "clsx";
import { DailyItem } from "../types/ItemTypes";


interface Props {
  items: DailyItem[];
  availableFavorites: DailyItem[];
  handleItemClick: (item: DailyItem) => void;
  expandFolders: boolean;
  location: string;
}

const DailyItemAccordion: React.FC<Props> = ({
  items,
  availableFavorites,
  handleItemClick,
  expandFolders,
  location,
}) => {
  // Group items by StationName
  const itemsByStation = items.reduce<Record<string, DailyItem[]>>((acc, item) => {
    if (!acc[item.StationName]) {
      acc[item.StationName] = [];
    }
    acc[item.StationName].push(item);
    return acc;
  }, {});

  // State to keep track of expanded stations within a location
  const [expandedState, setExpandedState] = React.useState<string[]>(
    Object.keys(itemsByStation).reduce<string[]>((acc, stationName) => {
      if (expandFolders) {
        acc.push(stationName);
      }
      return acc;
    }, [])
  );


  // Function to handle the accordion toggle
  const handleAccordionChange = (stationName: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    if (expandedState.includes(stationName) && !isExpanded) {
      setExpandedState((prev) => prev.filter((station) => station !== stationName));
    } else {
      setExpandedState((prev) => [...prev, stationName]);
    }
  };

  // useEffect to expand all stations if expandFolders is changed to true
  useEffect(() => {
    if (expandFolders) {
      setExpandedState(Object.keys(itemsByStation));
    }
  }
    , [expandFolders]);


  const defaultExpandedStations = ["My Favorites", "Comfort", "Comfort 1", "Comfort 2", "Rooted", "Rooted 1", "Rooted 2", "Pure Eats", "Pure Eats 1", "Pure Eats 2", "Kitchen Entree", "Kitchen Sides"]

  return (
    <div>
      {/* My Favorites Accordion */}
      {availableFavorites.length > 0 && (
        <Accordion defaultExpanded={true}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="my-favorites-content"
            id="my-favorites-header"
          >
            My Favorites
          </AccordionSummary>
          <AccordionDetails>
            <ul className="space-y-2">
              {availableFavorites.map((item, index) => (
                <li key={`fav-${item.Name}-${index}`}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className={clsx(
                      "w-full text-left p-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none border",
                      "bg-yellow-100 dark:bg-yellow-700 text-black dark:text-white border-yellow-300 dark:border-yellow-600"
                    )}
                  >
                    {item.Name} ★
                  </button>
                </li>
              ))}
            </ul>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Default Expanded Accordions */}
      {defaultExpandedStations
        .filter((stationName) => itemsByStation[stationName])
        .map((stationName) => (
          <Accordion key={stationName} defaultExpanded={true}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`${stationName}-content`}
              id={`${stationName}-header`}
            >
              {stationName}
            </AccordionSummary>
            <AccordionDetails>
              <ul className="space-y-2">
                {itemsByStation[stationName].map((item, index) => (
                  <li key={`${item.Name}-${index}`}>
                    <button
                      onClick={() => handleItemClick(item)}
                      className={clsx(
                        "w-full text-left p-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none rder",
                        availableFavorites.some((fav) => fav.Name === item.Name)
                          ? "bg-yellow-100 dark:bg-yellow-700 text-black dark:text-white border-yellow-300 dark:border-yellow-600 border"
                          : "bg-gray-200 dark:bg-[#1a1d24] text-black dark:text-white border-gray-400 dark:border-gray-600"
                      )}
                    >
                      {item.Name}{" "}
                      {availableFavorites.some((fav) => fav.Name === item.Name) ? "★" : "☆"}
                    </button>
                  </li>
                ))}
              </ul>
            </AccordionDetails>
          </Accordion>
        ))}


      {Object.entries(itemsByStation)
        .filter(([stationName]) => !defaultExpandedStations.includes(stationName))
        .map(([stationName, stationItems]) => (
          <Accordion
            key={stationName}
            expanded={expandedState.includes(stationName)}
            onChange={handleAccordionChange(stationName)}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`${stationName}-content`}
              id={`${stationName}-header`}
            >
              {stationName}
            </AccordionSummary>
            <AccordionDetails>
              <ul className="space-y-2">
                {stationItems.map((item, index) => (
                  <li key={`${item.Name}-${index}`}>
                    <button
                      onClick={() => handleItemClick(item)}
                      className={clsx(
                        "w-full text-left p-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none ",
                        availableFavorites.some((fav) => fav.Name === item.Name)
                          ? "bg-yellow-100 dark:bg-yellow-700 text-black dark:text-white border-yellow-300 dark:border-yellow-600 border"
                          : "bg-gray-200 dark:bg-[#1a1d24] text-black dark:text-white border-gray-400 dark:border-gray-600"
                      )}
                    >
                      {item.Name}{" "}
                      {availableFavorites.some((fav) => fav.Name === item.Name) ? "★" : "☆"}
                    </button>
                  </li>
                ))}
              </ul>
            </AccordionDetails>
          </Accordion>
        ))}
    </div>
  );

};

export default DailyItemAccordion;
