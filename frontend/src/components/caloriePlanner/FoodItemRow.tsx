import { Box, Chip, ListItemButton, ListItemText, Typography } from '@mui/material';
import React, { useMemo } from 'react';
import { ListChildComponentProps } from 'react-window';
import { DailyItem } from '../../types/ItemTypes';
import { SelectedDailyItem } from '../../util/caloriePlannerUtils';

// Define the structure of the data passed to each row
export interface RowData {
    items: DailyItem[];
    selectedItems: SelectedDailyItem[];
    handleSelectItem: (item: DailyItem) => void;
}

// Combine ListChildComponentProps with our custom data prop
type RowProps = ListChildComponentProps<RowData>;

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

    return (
        <ListItemButton
            style={style}
            key={`${item.Name}-${item.Location}-${item.TimeOfDay}-${index}`}
            onClick={() => handleSelectItem(item)}
            selected={isSelected}
            divider
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

export default FoodItemRow; 