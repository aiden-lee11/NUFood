import { Box, Chip, CircularProgress, Grid, Tab, Tabs, Typography } from '@mui/material';
import Fuse from 'fuse.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FoodItemsList from '../components/nutrientPlanner/FoodItemsList';
import SelectedItemsList from '../components/nutrientPlanner/SelectedItemsList';
import { useAuth } from '../context/AuthProvider';
import { useDataStore } from '../store';
import { DailyItem, NutritionGoals } from '../types/ItemTypes';
import { SelectedDailyItem, SortDirection, SortKey, calculateNutritionTotals, getSavedGoalsFromStorage, getSavedItemsFromStorage, saveGoalsToStorage } from '../util/nutrientPlannerUtils';

const NutrientPlanner: React.FC = () => {
    const { UserDataResponse, loading, error, nutritionGoals, fetchNutritionGoals, saveNutritionGoals, updateNutritionGoals } = useDataStore();
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
    const [activeTab, setActiveTab] = useState<number>(0);
    // Track if initial load has completed
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    // Track if we've already fetched nutrition goals
    const [hasLoadedGoals, setHasLoadedGoals] = useState<boolean>(false);

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

    // Load user nutrition goals only once when component mounts or auth changes
    useEffect(() => {
        if (!hasLoadedGoals) {
            if (user && token) {
                // If user is authenticated, fetch goals from backend
                fetchNutritionGoals(token)
                    .then(() => setHasLoadedGoals(true))
                    .catch(console.error);
            } else {
                // If not authenticated, load from localStorage and update store
                const localGoals = getSavedGoalsFromStorage();
                updateNutritionGoals(localGoals);
                setHasLoadedGoals(true);
            }
        }
    }, [user, token, fetchNutritionGoals, updateNutritionGoals, hasLoadedGoals]);

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

    const setActiveTabCallback = useCallback((tab: number) => {
        setActiveTab(tab);
    }, []);

    const allDailyItems = useMemo(() => UserDataResponse.dailyItemsWithNutrients || [], [UserDataResponse.dailyItemsWithNutrients]);

    const fuse = useMemo(() => new Fuse(allDailyItems, {
        keys: ['Name', 'Description', 'Location', 'StationName'],
        threshold: 0.3,
    }), [allDailyItems]);

    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) {
            return allDailyItems;
        }
        return fuse.search(searchTerm).map(result => result.item);
    }, [searchTerm, allDailyItems, fuse]);

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

    const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    }, []);

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
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
    }

    if (error) {
        return <Typography color="error" sx={{ p: 3 }}>Error loading data: {error}</Typography>;
    }

    return (
        <Box sx={{
            p: { xs: 1, sm: 2, md: 3 },
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '100vw',
            overflow: 'hidden'
        }}>
            <Typography variant="h4" gutterBottom sx={{
                flexShrink: 0,
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
                mb: 2
            }}>
                Nutrient Planner
            </Typography>

            {/* Mobile tabs */}
            <Box sx={{ width: '100%', display: { xs: 'block', md: 'none' }, mb: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{
                        mb: 2,
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 'medium'
                        }
                    }}
                >
                    <Tab label="Food Items" />
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography>My Plan</Typography>
                                {selectedItems.length > 0 && (
                                    <Chip
                                        label={selectedItems.length}
                                        size="small"
                                        color="primary"
                                        sx={{ ml: 1, height: 20 }}
                                    />
                                )}
                            </Box>
                        }
                    />
                </Tabs>
            </Box>

            <Grid container spacing={2} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {/* Available Items Section */}
                <Grid item xs={12} md={6} sx={{
                    display: activeTab === 0 ? 'flex' : { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    height: { xs: 'calc(100vh - 180px)', md: '100%' }
                }}>
                    <FoodItemsList
                        sortedItems={sortedItems}
                        selectedItems={selectedItems}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTermCallback}
                        sortKey={sortKey}
                        setSortKey={setSortKeyCallback}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirectionCallback}
                        showFilters={showFilters}
                        setShowFilters={setShowFiltersCallback}
                        handleSelectItem={handleSelectItem}
                    />
                </Grid>

                {/* Selected Items Section */}
                <Grid item xs={12} md={6} sx={{
                    display: activeTab === 1 ? 'flex' : { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    height: { xs: 'calc(100vh - 180px)', md: '100%' }
                }}>
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
                </Grid>
            </Grid>
        </Box>
    );
};

export default React.memo(NutrientPlanner); 
