import { FilterList, Search } from '@mui/icons-material';
import {
    Box,
    Collapse,
    FormControl,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    SelectChangeEvent,
    TextField,
    Typography
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import React from 'react';
import { FixedSizeList } from 'react-window';
import { DailyItem } from '../../types/ItemTypes';
import { SelectedDailyItem, SortDirection, SortKey } from '../../util/caloriePlannerUtils';
import FoodItemRow, { RowData } from './FoodItemRow';

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

const FoodItemsList: React.FC<FoodItemsListProps> = ({
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
    const handleSortKeyChange = (event: SelectChangeEvent<SortKey>) => {
        setSortKey(event.target.value as SortKey);
    };

    const handleSortDirectionChange = (event: SelectChangeEvent<SortDirection>) => {
        setSortDirection(event.target.value as SortDirection);
    };

    return (
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
                        } as RowData}
                    >
                        {FoodItemRow}
                    </FixedSizeList>
                )}
            </Box>
        </Paper>
    );
};

export default FoodItemsList; 