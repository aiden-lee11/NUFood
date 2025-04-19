import { Filter, Search } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DailyItem } from '../../types/ItemTypes';
import { SelectedDailyItem, SortDirection, SortKey } from '../../util/nutrientPlannerUtils';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Collapsible, CollapsibleContent } from '../ui/collapsible';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import FoodItemRow from './FoodItemRow';

// Debounce function to delay search updates
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

interface FoodItemsListProps {
    sortedItems: DailyItem[];
    selectedItems: SelectedDailyItem[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    sortKey: SortKey;
    setSortKey: (key: SortKey) => void;
    sortDirection: SortDirection;
    setSortDirection: (direction: SortDirection) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    handleSelectItem: (item: DailyItem) => void;
}

const FoodItemsList: React.FC<FoodItemsListProps> = React.memo(({
    sortedItems,
    selectedItems,
    searchTerm,
    setSearchTerm,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    showFilters,
    setShowFilters,
    handleSelectItem,
}) => {
    // Local state for the search input to avoid immediate updates
    const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
    const listRef = React.useRef<HTMLDivElement>(null);

    // Use a faster debounce time
    const debouncedSearchTerm = useDebounce(localSearchTerm, 150);

    // Update the parent's searchTerm only when debounced value changes
    useEffect(() => {
        setSearchTerm(debouncedSearchTerm);
    }, [debouncedSearchTerm, setSearchTerm]);

    // Memoize handlers to prevent recreation on each render
    const handleSortKeyChange = useCallback((value: string) => {
        setSortKey(value as SortKey);
    }, [setSortKey]);

    const handleSortDirectionChange = useCallback((value: string) => {
        setSortDirection(value as SortDirection);
    }, [setSortDirection]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSearchTerm(e.target.value);
    }, []);

    const handleToggleFilters = useCallback(() => {
        setShowFilters(!showFilters);
    }, [showFilters, setShowFilters]);

    // Memoize the row data to prevent unnecessary recreation
    const rowData = useMemo(() => ({
        items: sortedItems,
        selectedItems,
        handleSelectItem,
    }), [sortedItems, selectedItems, handleSelectItem]);

    return (
        <Card className="flex flex-col flex-grow overflow-hidden h-full">
            <CardHeader className="p-4 space-y-0 border-b flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="w-full pl-8 pr-8"
                            placeholder="Search food items..."
                            value={localSearchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <Button
                        variant={showFilters ? "default" : "outline"}
                        size="icon"
                        onClick={handleToggleFilters}
                        className="flex-shrink-0"
                        title="Toggle filters"
                    >
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>

                <Collapsible open={showFilters} className="w-full">
                    <CollapsibleContent className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sort-by">Sort By</Label>
                                <Select value={sortKey} onValueChange={handleSortKeyChange}>
                                    <SelectTrigger id="sort-by">
                                        <SelectValue placeholder="Select sort key" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Name">Name</SelectItem>
                                        <SelectItem value="Calories">Calories</SelectItem>
                                        <SelectItem value="Protein">Protein</SelectItem>
                                        <SelectItem value="Carbs">Carbs</SelectItem>
                                        <SelectItem value="Fat">Fat</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sort-order">Order</Label>
                                <Select value={sortDirection} onValueChange={handleSortDirectionChange}>
                                    <SelectTrigger id="sort-order">
                                        <SelectValue placeholder="Select sort direction" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="asc">Ascending</SelectItem>
                                        <SelectItem value="desc">Descending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </CardHeader>

            <CardContent className="flex-grow p-0 overflow-y-auto min-h-0 pb-24" ref={listRef}>
                {sortedItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-6">
                        <p className="text-muted-foreground text-center">
                            No food items match your search criteria.
                        </p>
                    </div>
                ) : (
                    <div className="w-full max-h-full">
                        {sortedItems.map((item, index) => {
                            // Create a style object that would normally be passed by react-window
                            const style = {
                                position: 'relative' as 'relative',
                                width: '100%',
                                height: 'auto'
                            };

                            return (
                                <FoodItemRow
                                    key={`${item.Name}-${item.Location}-${item.TimeOfDay}-${index}`}
                                    index={index}
                                    style={style}
                                    data={rowData}
                                />
                            );
                        })}
                        {/* Extra space at the bottom */}
                        <div className="h-16"></div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

export default React.memo(FoodItemsList); 