import { AddCircleOutline, Close, FilterList, RemoveCircleOutline, Search } from '@mui/icons-material';
import { Box, Button, Chip, CircularProgress, Collapse, FormControl, Grid, IconButton, InputAdornment, InputLabel, List, ListItem, ListItemButton, ListItemText, MenuItem, Paper, Select, SelectChangeEvent, Tab, Tabs, TextField, Typography, useTheme } from '@mui/material';
import Fuse from 'fuse.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { useDataStore } from '../store';
import { DailyItem } from '../types/ItemTypes';

type SortKey = 'Name' | 'Calories' | 'Protein' | 'Carbs' | 'Fat';
type SortDirection = 'asc' | 'desc';

// Extend DailyItem with quantity for selected items
interface SelectedDailyItem extends DailyItem {
    quantity: number;
}

// --- Row Component for Virtualized List ---
// Define the structure of the data passed to each row
interface RowData {
    items: DailyItem[];
    selectedItems: SelectedDailyItem[];
    handleSelectItem: (item: DailyItem) => void;
}

// Combine ListChildComponentProps (provides index, style) with our custom data prop
type RowProps = ListChildComponentProps<RowData>;

const Row: React.FC<RowProps> = React.memo(({ index, style, data }) => { // Props include index, style, data
    const { items, selectedItems, handleSelectItem } = data; // Destructure data object
    const item = items[index];

    // Determine if the current item is selected
    const isSelected = useMemo(() => selectedItems.some(
        (selected: SelectedDailyItem) => selected.Name === item.Name &&
            selected.Location === item.Location &&
            selected.TimeOfDay === item.TimeOfDay &&
            selected.Date === item.Date
    ), [selectedItems, item]);

    return (
        <ListItemButton
            style={style} // Important: Apply style from react-window
            key={`${item.Name}-${item.Location}-${item.TimeOfDay}-${index}`}
            onClick={() => handleSelectItem(item)}
            selected={isSelected}
            divider // Add divider between items
            sx={{
                py: 1.5,
                borderColor: 'divider',
                '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    }
                }
            }}
        >
            <ListItemText
                primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
                            {item.Name}
                        </Typography>
                        {isSelected && <Chip size="small" label="Added" color="primary" sx={{ height: 20, ml: 1 }} />}
                    </Box>
                }
                secondary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {item.Location} ({item.TimeOfDay})
                        </Typography>
                        <Typography variant="caption" sx={{ mt: 0.5 }}>
                            <Box component="span" sx={{ fontWeight: 'medium' }}>C:</Box> {item.calories || 'N/A'} •
                            <Box component="span" sx={{ fontWeight: 'medium', ml: 1 }}>P:</Box> {item.protein || 'N/A'}g •
                            <Box component="span" sx={{ fontWeight: 'medium', ml: 1 }}>C:</Box> {item.carbs || 'N/A'}g •
                            <Box component="span" sx={{ fontWeight: 'medium', ml: 1 }}>F:</Box> {item.fat || 'N/A'}g
                        </Typography>
                    </Box>
                }
            />
        </ListItemButton>
    );
});
// --- End Row Component ---

const CaloriePlanner: React.FC = () => {
    const theme = useTheme();
    const { UserDataResponse, loading, error } = useDataStore();

    // Initialize state from session storage
    const getSavedItemsFromStorage = (): SelectedDailyItem[] => {
        try {
            const savedItems = sessionStorage.getItem('calorieplannerItems');
            return savedItems ? JSON.parse(savedItems) : [];
        } catch (e) {
            console.error('Error loading saved items from sessionStorage', e);
            return [];
        }
    };

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

    // First useEffect to mark component as initialized after first render
    useEffect(() => {
        setIsInitialized(true);
    }, []);

    // Save to sessionStorage only after initialization and when selectedItems change
    useEffect(() => {
        if (isInitialized) {
            sessionStorage.setItem('calorieplannerItems', JSON.stringify(selectedItems));
        }
    }, [selectedItems, isInitialized]);

    useEffect(() => {
        let calories = 0;
        let protein = 0;
        let carbs = 0;
        let fat = 0;
        selectedItems.forEach(item => {
            // Handle NaN values by converting them to 0
            const itemCalories = parseFloat(item.calories || '0');
            const itemProtein = parseFloat(item.protein || '0');
            const itemCarbs = parseFloat(item.carbs || '0');
            const itemFat = parseFloat(item.fat || '0');

            calories += !isNaN(itemCalories) ? itemCalories * item.quantity : 0;
            protein += !isNaN(itemProtein) ? itemProtein * item.quantity : 0;
            carbs += !isNaN(itemCarbs) ? itemCarbs * item.quantity : 0;
            fat += !isNaN(itemFat) ? itemFat * item.quantity : 0;
        });
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

    const handleSortKeyChange = (event: SelectChangeEvent<SortKey>) => {
        setSortKey(event.target.value as SortKey);
    };

    const handleSortDirectionChange = (event: SelectChangeEvent<SortDirection>) => {
        setSortDirection(event.target.value as SortDirection);
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Helper function to properly format nutrient values
    const getNutrientDisplay = (value: string | undefined, quantity: number, unit: string = '') => {
        if (!value || value === 'NaN' || value === 'NaNg' || value === 'undefined') {
            return 'N/A';
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            return 'N/A';
        }

        return `${(numValue * quantity).toFixed(1)}${unit}`;
    };

    // Calculate nutrition percentage based on general daily values
    const calculatePercentage = (value: number, dailyValue: number) => {
        return Math.min(100, Math.round((value / dailyValue) * 100));
    };

    const proteinPercentage = calculatePercentage(totalProtein, 50); // Using 50g as reference
    const carbsPercentage = calculatePercentage(totalCarbs, 275); // Using 275g as reference
    const fatPercentage = calculatePercentage(totalFat, 78); // Using 78g as reference

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
                Calorie Planner
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
                    <Paper sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flexGrow: 1,
                        overflow: 'hidden'
                    }}>
                        {/* Search Bar */}
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                            <TextField
                                fullWidth
                                placeholder="Search food items..."
                                variant="outlined"
                                size="small"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search fontSize="small" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => setShowFilters(!showFilters)}
                                                color={showFilters ? "primary" : "default"}
                                            >
                                                <FilterList fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <Collapse in={showFilters}>
                                <Box sx={{
                                    display: 'flex',
                                    gap: 1,
                                    mt: 2,
                                    flexWrap: { xs: 'nowrap', sm: 'wrap' }
                                }}>
                                    <FormControl size="small" sx={{ flex: 1, minWidth: 110 }}>
                                        <InputLabel>Sort By</InputLabel>
                                        <Select value={sortKey} label="Sort By" onChange={handleSortKeyChange}>
                                            <MenuItem value="Name">Name</MenuItem>
                                            <MenuItem value="Calories">Calories</MenuItem>
                                            <MenuItem value="Protein">Protein</MenuItem>
                                            <MenuItem value="Carbs">Carbs</MenuItem>
                                            <MenuItem value="Fat">Fat</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl size="small" sx={{ flex: 1, minWidth: 80 }}>
                                        <InputLabel>Order</InputLabel>
                                        <Select value={sortDirection} label="Order" onChange={handleSortDirectionChange}>
                                            <MenuItem value="asc">Ascending</MenuItem>
                                            <MenuItem value="desc">Descending</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Collapse>
                        </Box>

                        {/* Food Item List */}
                        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                            {sortedItems.length === 0 ? (
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    p: 3
                                }}>
                                    <Typography variant="body2" color="text.secondary" align="center">
                                        No food items match your search criteria.
                                    </Typography>
                                </Box>
                            ) : (
                                <FixedSizeList
                                    height={600}
                                    width="100%"
                                    itemSize={90}
                                    itemCount={sortedItems.length}
                                    overscanCount={5}
                                    itemData={{
                                        items: sortedItems,
                                        selectedItems,
                                        handleSelectItem,
                                    }}
                                >
                                    {Row}
                                </FixedSizeList>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* Selected Items Section */}
                <Grid item xs={12} md={6} sx={{
                    display: activeTab === 1 ? 'flex' : { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    height: { xs: 'calc(100vh - 180px)', md: '100%' }
                }}>
                    <Paper sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flexGrow: 1,
                        overflow: 'hidden'
                    }}>
                        {/* Header with count */}
                        <Box sx={{
                            p: 2,
                            borderBottom: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                My Food Plan
                            </Typography>
                            {selectedItems.length > 0 && (
                                <Chip
                                    label={`${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}`}
                                    color="primary"
                                    size="small"
                                />
                            )}
                        </Box>

                        {/* Nutrition summary */}
                        {selectedItems.length > 0 && (
                            <Box sx={{
                                p: { xs: 1, sm: 2 },
                                borderBottom: 1,
                                borderColor: 'divider',
                                bgcolor: 'background.paper'
                            }}>
                                <Grid container spacing={1}>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{
                                            p: 1,
                                            textAlign: 'center',
                                            borderRadius: 1,
                                            bgcolor: 'background.default',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                        }}>
                                            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                                                {totalCalories.toFixed(0)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                CALORIES
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{
                                            p: 1,
                                            textAlign: 'center',
                                            borderRadius: 1,
                                            bgcolor: 'background.default',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                        }}>
                                            <Typography variant="body1" color="success.main" sx={{ fontWeight: 'bold' }}>
                                                {totalProtein.toFixed(1)}g
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                PROTEIN ({proteinPercentage}%)
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{
                                            p: 1,
                                            textAlign: 'center',
                                            borderRadius: 1,
                                            bgcolor: 'background.default',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                        }}>
                                            <Typography variant="body1" color="info.main" sx={{ fontWeight: 'bold' }}>
                                                {totalCarbs.toFixed(1)}g
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                CARBS ({carbsPercentage}%)
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{
                                            p: 1,
                                            textAlign: 'center',
                                            borderRadius: 1,
                                            bgcolor: 'background.default',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                        }}>
                                            <Typography variant="body1" color="warning.main" sx={{ fontWeight: 'bold' }}>
                                                {totalFat.toFixed(1)}g
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                FAT ({fatPercentage}%)
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        {/* List of selected items */}
                        <Box sx={{
                            overflow: 'auto',
                            flexGrow: 1
                        }}>
                            {selectedItems.length === 0 ? (
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    p: 4,
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="body1" color="text.secondary" gutterBottom>
                                        No items in your plan yet
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Select items from the available food list to build your meal plan
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => setActiveTab(0)}
                                        sx={{ display: { xs: 'block', md: 'none' } }}
                                    >
                                        Browse Food Items
                                    </Button>
                                </Box>
                            ) : (
                                <List>
                                    {selectedItems.map((item, index) => (
                                        <ListItem
                                            key={`selected-${item.Name}-${item.Location}-${item.TimeOfDay}-${index}`}
                                            divider
                                            sx={{
                                                py: 2,
                                                borderColor: 'divider'
                                            }}
                                        >
                                            <Box sx={{ width: '100%' }}>
                                                <Box sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start'
                                                }}>
                                                    <Box sx={{ flex: 1, pr: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                            {item.Name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {item.Location} ({item.TimeOfDay})
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        bgcolor: 'action.hover',
                                                        borderRadius: 1,
                                                        p: 0.5
                                                    }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleQuantityChange(item, -1)}
                                                            disabled={item.quantity <= 1}
                                                            sx={{ p: 0.5 }}
                                                        >
                                                            <RemoveCircleOutline fontSize="small" />
                                                        </IconButton>
                                                        <Typography variant="body2" sx={{ mx: 1, minWidth: '24px', textAlign: 'center' }}>
                                                            {item.quantity}
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleQuantityChange(item, 1)}
                                                            sx={{ p: 0.5 }}
                                                        >
                                                            <AddCircleOutline fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Box>

                                                <Box sx={{
                                                    display: 'flex',
                                                    flexDirection: { xs: 'column', sm: 'row' },
                                                    justifyContent: 'space-between',
                                                    alignItems: { xs: 'flex-start', sm: 'center' },
                                                    mt: 1
                                                }}>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: { xs: 1, sm: 2 }
                                                    }}>
                                                        <Typography variant="caption">
                                                            <Box component="span" sx={{ fontWeight: 'medium' }}>Cal:</Box> {getNutrientDisplay(item.calories, item.quantity)}
                                                        </Typography>
                                                        <Typography variant="caption">
                                                            <Box component="span" sx={{ fontWeight: 'medium' }}>P:</Box> {getNutrientDisplay(item.protein, item.quantity, 'g')}
                                                        </Typography>
                                                        <Typography variant="caption">
                                                            <Box component="span" sx={{ fontWeight: 'medium' }}>C:</Box> {getNutrientDisplay(item.carbs, item.quantity, 'g')}
                                                        </Typography>
                                                        <Typography variant="caption">
                                                            <Box component="span" sx={{ fontWeight: 'medium' }}>F:</Box> {getNutrientDisplay(item.fat, item.quantity, 'g')}
                                                        </Typography>
                                                    </Box>

                                                    <IconButton
                                                        edge="end"
                                                        aria-label="delete"
                                                        size="small"
                                                        onClick={() => handleSelectItem(item)}
                                                        sx={{ mt: { xs: 1, sm: 0 } }}
                                                    >
                                                        <Close fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default CaloriePlanner; 