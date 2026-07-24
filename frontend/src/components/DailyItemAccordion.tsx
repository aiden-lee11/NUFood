import React, { useEffect } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Info } from "lucide-react";
import clsx from "clsx";
import { DailyItem } from "../types/ItemTypes";
import { inlineCaption } from "../util/nutritionFormat";
import NutritionDialog from "./NutritionDialog";


interface Props {
  items: DailyItem[];
  availableFavorites: DailyItem[];
  handleItemClick: (item: DailyItem) => void;
  expandFolders: boolean;
  showNutrition: boolean;
}

/**
 * A single item row: a bordered card whose name/star area toggles the favorite, with a
 * muted ⓘ button (its own click target, stopPropagation) sitting LEFT of the star that
 * opens the nutrition detail dialog. Mirrors iOS `ItemRowButton` (SPEC §5.3).
 */
const ItemRow: React.FC<{
  item: DailyItem;
  isFavorite: boolean;
  favoriteBorderClass: string;
  showNutrition: boolean;
  onToggle: (item: DailyItem) => void;
  onInfo: (item: DailyItem) => void;
}> = ({ item, isFavorite, favoriteBorderClass, showNutrition, onToggle, onInfo }) => {
  const caption = showNutrition ? inlineCaption(item) : null;

  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-lg border-2 p-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.99] hover:shadow-md",
        isFavorite
          ? clsx("bg-item-selected text-item-selected-foreground shadow-sm", favoriteBorderClass)
          : "bg-card text-card-foreground border-border hover:bg-item-hover hover:border-muted-foreground"
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? `Remove ${item.Name} from favorites` : `Add ${item.Name} to favorites`}
        className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <div className="truncate">{item.Name}</div>
        {caption && (
          <div
            className={clsx(
              "truncate text-xs",
              isFavorite ? "text-item-selected-foreground opacity-75" : "text-muted-foreground"
            )}
          >
            {caption}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInfo(item);
        }}
        aria-label={`Nutrition info for ${item.Name}`}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-hidden="true"
        tabIndex={-1}
        className="shrink-0 focus:outline-none"
      >
        {isFavorite ? "★" : "☆"}
      </button>
    </div>
  );
};

const DailyItemAccordion: React.FC<Props> = ({
  items,
  availableFavorites,
  handleItemClick,
  expandFolders,
  showNutrition,
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

  // The item whose nutrition detail dialog is open, if any.
  const [detailItem, setDetailItem] = React.useState<DailyItem | null>(null);

  const isFavorite = (item: DailyItem) =>
    availableFavorites.some((fav) => fav.Name === item.Name);


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
                  <ItemRow
                    item={item}
                    isFavorite={true}
                    favoriteBorderClass="border-chart-5"
                    showNutrition={showNutrition}
                    onToggle={handleItemClick}
                    onInfo={setDetailItem}
                  />
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
                    <ItemRow
                      item={item}
                      isFavorite={isFavorite(item)}
                      favoriteBorderClass="border-primary"
                      showNutrition={showNutrition}
                      onToggle={handleItemClick}
                      onInfo={setDetailItem}
                    />
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
                    <ItemRow
                      item={item}
                      isFavorite={isFavorite(item)}
                      favoriteBorderClass="border-primary"
                      showNutrition={showNutrition}
                      onToggle={handleItemClick}
                      onInfo={setDetailItem}
                    />
                  </li>
                ))}
              </ul>
            </AccordionDetails>
          </Accordion>
        ))}

      <NutritionDialog
        item={detailItem}
        isFavorite={detailItem ? isFavorite(detailItem) : false}
        onToggleFavorite={handleItemClick}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
      />
    </div>
  );

};

export default DailyItemAccordion;
