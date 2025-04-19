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
                "cursor-pointer border-b hover:bg-secondary/40 transition-colors p-4 mb-2",
                isSelected && "bg-secondary/60"
            )}
            onClick={handleClick}
        >
            <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <div className={cn("font-medium", isSelected && "font-semibold")}>
                        {item.Name}
                    </div>
                    {isSelected && <Badge variant="secondary" className="ml-1">Added</Badge>}
                </div>

                <span className="text-xs text-muted-foreground mb-3">
                    {item.Location} ({item.TimeOfDay})
                </span>

                <div className="flex flex-col space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="font-medium">Calories:</span>
                        <span>{item.calories || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-medium">Protein:</span>
                        <span>{formatNutritionValue(item.protein)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-medium">Carbs:</span>
                        <span>{formatNutritionValue(item.carbs)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-medium">Fat:</span>
                        <span>{formatNutritionValue(item.fat)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default FoodItemRow; 