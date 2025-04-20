import Fuse from 'fuse.js';
import { Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FoodItemsList from '../components/nutrientPlanner/FoodItemsList';
import SelectedItemsList from '../components/nutrientPlanner/SelectedItemsList';
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from '../context/AuthProvider';
import { useDataStore } from '../store';
import { DailyItem, NutritionGoals } from '../types/ItemTypes';
import { SelectedDailyItem, SortDirection, SortKey, calculateNutritionTotals, getSavedItemsFromStorage, saveGoalsToStorage } from '../util/nutrientPlannerUtils';


// Helper function to get current date formatted as YYYY-MM-DD
const getCurrentDateFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const NutrientPlanner: React.FC = () => {
    // Select necessary data directly from the store
    const UserDataResponse = useDataStore((state) => state.UserDataResponse);
    const nutritionGoals = useDataStore((state) => state.UserDataResponse.nutritionGoals);
    const loading = useDataStore((state) => state.loading);
    const error = useDataStore((state) => state.error);
    const saveNutritionGoals = useDataStore((state) => state.saveNutritionGoals);

    const { user, token } = useAuth();

    // State management
    const [selectedItems, setSelectedItems] = useState<SelectedDailyItem[]>(getSavedItemsFromStorage());
    const [totalCalories, setTotalCalories] = useState<number>(0);
    const [totalProtein, setTotalProtein] = useState<number>(0);
    const [totalCarbs, setTotalCarbs] = useState<number>(0);
    const [totalFat, setTotalFat] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortKey, setSortKey] = useState<SortKey>('Name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [showFilters, setShowFilters] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<string>("food-items");
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    // Track if initial load has completed
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // First useEffect to mark component as initialized after first render
    useEffect(() => {
        setIsInitialized(true);
    }, []);

    // Save to sessionStorage only after initialization and when selectedItems change
    useEffect(() => {
        if (isInitialized) {
            sessionStorage.setItem('nutrientplannerItems', JSON.stringify(selectedItems));
        }
    }, [selectedItems, isInitialized]);

    // Calculate nutrition totals
    useEffect(() => {
        const { calories, protein, carbs, fat } = calculateNutritionTotals(selectedItems);
        setTotalCalories(calories);
        setTotalProtein(protein);
        setTotalCarbs(carbs);
        setTotalFat(fat);
    }, [selectedItems]);

    const handleSelectItem = useCallback((item: DailyItem) => {
        setSelectedItems(prevSelected => {
            const isSelected = prevSelected.some(
                (selected: SelectedDailyItem) => selected.Name === item.Name &&
                    selected.Location === item.Location &&
                    selected.TimeOfDay === item.TimeOfDay &&
                    selected.Date === item.Date
            );
            if (isSelected) {
                return prevSelected.filter(
                    (selected: SelectedDailyItem) => !(selected.Name === item.Name &&
                        selected.Location === item.Location &&
                        selected.TimeOfDay === item.TimeOfDay &&
                        selected.Date === item.Date)
                );
            } else {
                return [...prevSelected, { ...item, quantity: 1 }];
            }
        });
    }, []);

    const handleQuantityChange = useCallback((item: SelectedDailyItem, change: number) => {
        setSelectedItems(prevSelected =>
            prevSelected.map(selected => {
                if (selected.Name === item.Name &&
                    selected.Location === item.Location &&
                    selected.TimeOfDay === item.TimeOfDay &&
                    selected.Date === item.Date) {
                    const newQuantity = Math.max(1, selected.quantity + change);
                    return { ...selected, quantity: newQuantity };
                }
                return selected;
            })
        );
    }, []);

    // Memoize search functions to avoid recreating them on every render
    const setSearchTermCallback = useCallback((term: string) => {
        setSearchTerm(term);
    }, []);

    const setSortKeyCallback = useCallback((key: SortKey) => {
        setSortKey(key);
    }, []);

    const setSortDirectionCallback = useCallback((direction: SortDirection) => {
        setSortDirection(direction);
    }, []);

    const setShowFiltersCallback = useCallback((show: boolean) => {
        setShowFilters(show);
    }, []);

    const setActiveTabCallback = useCallback((tab: string) => {
        setActiveTab(tab);
    }, []);

    const setSelectedLocationCallback = useCallback((location: string | null) => {
        setSelectedLocation(location);
    }, []);

    // Get today's items from weeklyItems
    const todaysItems = useMemo(() => {
        // const dayName = getCurrentDayName(); // Old way using day name
        const currentDate = getCurrentDateFormatted(); // New way using YYYY-MM-DD
        console.log("Fetching items for date:", currentDate); // Log the date being used
        console.log("Available keys in weeklyItems:", UserDataResponse.weeklyItems ? Object.keys(UserDataResponse.weeklyItems) : 'weeklyItems is undefined'); // Log available keys
        return UserDataResponse.weeklyItems?.[currentDate] || [];
    }, [UserDataResponse.weeklyItems]);

    // Derive available locations from today's items
    const availableLocations = useMemo(() => {
        console.log(todaysItems);
        const locations = new Set(todaysItems.map(item => item.Location));
        return Array.from(locations).sort();
    }, [todaysItems]);

    // Update Fuse.js implementation to use today's items
    const fuse = useMemo(() => new Fuse(todaysItems, {
        keys: ['Name'],
        threshold: 0.3,
        shouldSort: true,
        includeScore: true,
        minMatchCharLength: 2
    }), [todaysItems]);

    const filteredItems = useMemo(() => {
        let itemsToFilter = todaysItems;

        // Apply location filter first if a location is selected
        if (selectedLocation) {
            itemsToFilter = itemsToFilter.filter(item => item.Location === selectedLocation);
        }

        if (!searchTerm.trim()) {
            return itemsToFilter; // Return location-filtered items if no search term
        }

        // Re-initialize Fuse with the potentially location-filtered items
        const currentFuse = new Fuse(itemsToFilter, {
            keys: ['Name'],
            threshold: 0.3,
            shouldSort: true,
            includeScore: true,
            minMatchCharLength: 2
        });

        // For short search terms (1-2 chars), prefer exact matches first
        if (searchTerm.length <= 2) {
            const exactMatches = itemsToFilter.filter(item =>
                item.Name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (exactMatches.length > 0) {
                return exactMatches;
            }
        }

        // Use Fuse for fuzzy search on the (potentially location-filtered) items
        return currentFuse.search(searchTerm)
            .sort((a, b) => (a.score || 1) - (b.score || 1))
            .map(result => result.item);
    }, [searchTerm, todaysItems, selectedLocation, fuse]); // Updated dependency to todaysItems

    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            let valA: string | number;
            let valB: string | number;

            switch (sortKey) {
                case 'Calories':
                    valA = parseFloat(a.calories || '0');
                    valB = parseFloat(b.calories || '0');
                    break;
                case 'Protein':
                    valA = parseFloat(a.protein || '0');
                    valB = parseFloat(b.protein || '0');
                    break;
                case 'Carbs':
                    valA = parseFloat(a.carbs || '0');
                    valB = parseFloat(b.carbs || '0');
                    break;
                case 'Fat':
                    valA = parseFloat(a.fat || '0');
                    valB = parseFloat(b.fat || '0');
                    break;
                case 'Name':
                default:
                    valA = a.Name.toLowerCase();
                    valB = b.Name.toLowerCase();
                    break;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredItems, sortKey, sortDirection]);

    // Add handleSaveGoals function
    const handleSaveGoals = useCallback(async (goalsToSave: NutritionGoals) => {
        if (user && token) {
            try {
                await saveNutritionGoals(token, goalsToSave);
                console.log('Goals saved to backend successfully.');
            } catch (err) {
                console.error('Failed to save goals to backend:', err);
            }
        } else {
            saveGoalsToStorage(goalsToSave);
            console.log('Goals saved to local storage.');
        }
    }, [user, token, saveNutritionGoals]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[80vh]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return <p className="p-3 text-destructive">Error loading data: {error}</p>;
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col max-w-[100vw] overflow-hidden">
            <h1 className="text-2xl md:text-3xl lg:text-4xl mb-4 flex-shrink-0">
                Nutrient Planner
            </h1>

            {/* Mobile tabs - only shown on small screens */}
            <div className="w-full md:hidden mb-4">
                <Tabs value={activeTab} onValueChange={setActiveTabCallback} className="w-full">
                    <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="food-items">Food Items</TabsTrigger>
                        <TabsTrigger value="my-plan" className="flex items-center">
                            My Plan
                            {selectedItems.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {selectedItems.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-hidden">
                {/* Left Column: Food Items List (visible on medium+ or when 'food-items' tab is active) */}
                <div className={`flex-1 flex-col ${activeTab === 'food-items' ? 'flex' : 'hidden'} md:flex overflow-y-auto`}>
                    <FoodItemsList
                        sortedItems={sortedItems}
                        selectedItems={selectedItems}
                        handleSelectItem={handleSelectItem}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTermCallback}
                        sortKey={sortKey}
                        setSortKey={setSortKeyCallback}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirectionCallback}
                        showFilters={showFilters}
                        setShowFilters={setShowFiltersCallback}
                        availableLocations={availableLocations}
                        selectedLocation={selectedLocation}
                        setSelectedLocation={setSelectedLocationCallback}
                    />
                </div>

                {/* Selected Items Section */}
                <div className={`flex flex-col h-[calc(100vh-180px)] pb-12 md:h-full overflow-hidden ${activeTab === "my-plan" ? "block" : "hidden md:flex"}`}>
                    <SelectedItemsList
                        selectedItems={selectedItems}
                        totalCalories={totalCalories}
                        totalProtein={totalProtein}
                        totalCarbs={totalCarbs}
                        totalFat={totalFat}
                        handleSelectItem={handleSelectItem}
                        handleQuantityChange={handleQuantityChange}
                        setActiveTab={setActiveTabCallback}
                        nutritionGoals={nutritionGoals}
                        handleSaveGoals={handleSaveGoals}
                    />
                </div>
            </div>
        </div>
    );
};

export default React.memo(NutrientPlanner); 
