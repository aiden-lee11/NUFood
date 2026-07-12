import React, { useCallback, useMemo } from 'react';
import { ListChildComponentProps } from 'react-window';
import { cn } from '../../lib/utils';
import { DailyItem } from '../../types/ItemTypes';
import { SelectedDailyItem } from '../../util/nutrientPlannerUtils';
import { Badge } from '../ui/badge';

// Define the structure of the data passed to each row
export interface RowData {
    items: DailyItem[];
    selectedItems: SelectedDailyItem[];
    handleSelectItem: (item: DailyItem) => void;
}

// Combine ListChildComponentProps with our custom data prop
type RowProps = ListChildComponentProps<RowData>;

// Helper function to format nutrition values
const formatNutritionValue = (value: string | undefined): string => {
    if (!value) return 'N/A';

    // Check if the value contains "less than 1 gram"
    if (value.toLowerCase().includes('less than 1 gram')) {
        return value; // Return as is, without adding 'g'
    }

    // For numeric values, add 'g' suffix
    return `${value}g`;
};

const FoodItemRow: React.FC<RowProps> = React.memo(({ index, style, data }) => {
    const { items, selectedItems, handleSelectItem } = data;
    const item = items[index];

    // Determine if the current item is selected
    const isSelected = useMemo(() => selectedItems.some(
        (selected: SelectedDailyItem) => selected.Name === item.Name &&
            selected.Location === item.Location &&
            selected.TimeOfDay === item.TimeOfDay &&
            selected.Date === item.Date
    ), [selectedItems, item]);

    // Memoize the click handler to prevent recreation on every render
    const handleClick = useCallback(() => {
        handleSelectItem(item);
    }, [handleSelectItem, item]);

    return (
        <div
            style={style}
            className={cn(
                "cursor-pointer border rounded-xl hover:bg-item-hover hover:shadow-md transition-all duration-200 p-4 mb-3",
                isSelected
                    ? "bg-item-selected text-item-selected-foreground border-primary shadow-sm"
                    : "bg-card text-card-foreground border-border hover:border-muted-foreground"
            )}
            onClick={handleClick}
        >
            <div className="flex flex-col">
                <div className="flex justify-between items-center gap-2 mb-1">
                    <div className="text-base font-semibold">
                        {item.Name}
                    </div>
                    {isSelected && <Badge className="ml-1 shrink-0 bg-primary text-primary-foreground">Added</Badge>}
                </div>

                <span className="text-xs text-muted-foreground mb-3">
                    {item.Location} ({item.TimeOfDay})
                </span>

                <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Portion Size:</span>
                        <span className="text-foreground font-medium text-right">{item.portion || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Calories:</span>
                        <span className="text-foreground font-medium text-right">{item.calories || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Protein:</span>
                        <span className="text-foreground font-medium text-right">{formatNutritionValue(item.protein)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Carbs:</span>
                        <span className="text-foreground font-medium text-right">{formatNutritionValue(item.carbs)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Fat:</span>
                        <span className="text-foreground font-medium text-right">{formatNutritionValue(item.fat)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default FoodItemRow; 