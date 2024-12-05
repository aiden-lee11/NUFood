import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import clsx from "clsx";

interface DailyItem {
  Name: string;
  Description: string;
  Location: string;
  StationName: string;
  Date: string;
  TimeOfDay: string;
}

interface FavoriteItem {
  Name: string;
}

interface Props {
  items: DailyItem[];
  favorites: FavoriteItem[];
  availableFavorites: DailyItem[];
  handleItemClick: (item: DailyItem) => void;
}

const DailyItemAccordion: React.FC<Props> = ({
  items,
  favorites,
  availableFavorites,
  handleItemClick,
}) => {
  // Group items by StationName
  const itemsByStation = items.reduce<Record<string, DailyItem[]>>((acc, item) => {
    if (!acc[item.StationName]) {
      acc[item.StationName] = [];
    }
    acc[item.StationName].push(item);
    return acc;
  }, {});

  // Filter favorites that belong to the location
  const myFavorites = availableFavorites.filter((favorite) =>
    items.some((item) => item.Location === favorite.Location && item.Name === favorite.Name)
  );


  const expandedStations = ["My Favorites", "Comfort", "Comfort 1", "Comfort 2", "Rooted", "Rooted 1", "Rooted 2", "Pure Eats", "Pure Eats 1", "Pure Eats 2", "Kitchen Entree", "Kitchen Sides"]

  return (
    <div>
      {/* Default Expanded Accordions */}
      {expandedStations
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
                        "w-full text-left p-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none border",
                        favorites.some((fav) => fav.Name === item.Name)
                          ? "bg-gray-300 dark:bg-gray-700 text-black dark:text-white border-gray-400 dark:border-gray-600"
                          : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-700"
                      )}
                    >
                      {item.Name}{" "}
                      {favorites.some((fav) => fav.Name === item.Name) ? "★" : "☆"}
                    </button>
                  </li>
                ))}
              </ul>
            </AccordionDetails>
          </Accordion>
        ))}

      {/* My Favorites Accordion */}
      {myFavorites.length > 0 && (
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
              {myFavorites.map((item, index) => (
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

      {/* Other Accordions */}
      {Object.entries(itemsByStation)
        .filter(([stationName]) => !expandedStations.includes(stationName))
        .map(([stationName, stationItems]) => (
          <Accordion key={stationName}>
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
                        "w-full text-left p-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none border",
                        favorites.some((fav) => fav.Name === item.Name)
                          ? "bg-gray-300 dark:bg-gray-700 text-black dark:text-white border-gray-400 dark:border-gray-600"
                          : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-700"
                      )}
                    >
                      {item.Name}{" "}
                      {favorites.some((fav) => fav.Name === item.Name) ? "★" : "☆"}
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
