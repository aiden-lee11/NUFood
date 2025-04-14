import { AddCircleOutline, Close, RemoveCircleOutline } from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    IconButton,
    List,
    ListItem,
    Paper,
    Typography
} from '@mui/material';
import React from 'react';
import { DailyItem } from '../../types/ItemTypes';
import { getNutrientDisplay, SelectedDailyItem } from '../../util/caloriePlannerUtils';
import NutritionSummary from './NutritionSummary';

interface SelectedItemsListProps {
    selectedItems: SelectedDailyItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    handleSelectItem: (item: DailyItem) => void;
    handleQuantityChange: (item: SelectedDailyItem, change: number) => void;
    setActiveTab: (tab: number) => void;
}

const SelectedItemsList: React.FC<SelectedItemsListProps> = ({
    selectedItems,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    handleSelectItem,
    handleQuantityChange,
    setActiveTab
}) => {
    return (
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
                <NutritionSummary
                    totalCalories={totalCalories}
                    totalProtein={totalProtein}
                    totalCarbs={totalCarbs}
                    totalFat={totalFat}
                />
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
    );
};

export default SelectedItemsList; 