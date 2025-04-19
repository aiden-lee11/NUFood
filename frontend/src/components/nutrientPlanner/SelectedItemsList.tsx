import { Settings } from '@mui/icons-material';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Typography
} from '@mui/material';
import React, { useState } from 'react';
import { useDataStore } from '../../store';
import { DailyItem, NutritionGoals } from '../../types/ItemTypes';
import { SelectedDailyItem } from '../../util/nutrientPlannerUtils';
import NutritionGoalsDialog from './NutritionGoalsDialog';

interface SelectedItemsListProps {
    selectedItems: SelectedDailyItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    handleSelectItem: (item: DailyItem) => void;
    handleQuantityChange: (item: SelectedDailyItem, change: number) => void;
    setActiveTab: (tab: number) => void;
    nutritionGoals: NutritionGoals;
    handleSaveGoals: (goalsToSave: NutritionGoals) => Promise<void>;
}

const SelectedItemsList: React.FC<SelectedItemsListProps> = ({
    selectedItems,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    handleSelectItem,
    handleQuantityChange,
    setActiveTab,
    nutritionGoals,
    handleSaveGoals
}) => {
    const [showGoalsDialog, setShowGoalsDialog] = useState(false);
    const { updateNutritionGoals } = useDataStore();

    const handleOpenGoalsDialog = () => setShowGoalsDialog(true);
    const handleCloseGoalsDialog = () => setShowGoalsDialog(false);

    const handleSaveGoalsDialog = (newGoals: NutritionGoals) => {
        updateNutritionGoals(newGoals);
        handleSaveGoals(newGoals);
    };

    return (
        <Paper sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
        }}>
            <Box sx={{
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Typography variant="h6">My Food Plan</Typography>
                <IconButton
                    onClick={handleOpenGoalsDialog}
                    size="small"
                    color="primary"
                    title="Set Nutrition Goals"
                >
                    <Settings />
                </IconButton>
            </Box>

            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>Daily Totals</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Calories
                        </Typography>
                        <Typography>
                            {totalCalories.toFixed(1)} / {nutritionGoals.calories}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Protein
                        </Typography>
                        <Typography>
                            {totalProtein.toFixed(1)}g / {nutritionGoals.protein}g
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Carbs
                        </Typography>
                        <Typography>
                            {totalCarbs.toFixed(1)}g / {nutritionGoals.carbs}g
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Fat
                        </Typography>
                        <Typography>
                            {totalFat.toFixed(1)}g / {nutritionGoals.fat}g
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Selected Items List */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                {selectedItems.length === 0 ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: 2
                    }}>
                        <Typography variant="body2" color="text.secondary" align="center">
                            No items in your plan yet
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => setActiveTab(0)}
                            sx={{ display: { xs: 'block', md: 'none' } }}
                        >
                            Add Food Items
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {selectedItems.map((item, index) => (
                            <Paper
                                key={`${item.Name}-${item.Location}-${item.TimeOfDay}-${index}`}
                                variant="outlined"
                                sx={{ p: 2 }}
                            >
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start'
                                }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2">{item.Name}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {item.Location} ({item.TimeOfDay})
                                        </Typography>
                                        <Box sx={{ mt: 1 }}>
                                            <Typography variant="body2">
                                                Calories: {(parseFloat(item.calories || '0') * item.quantity).toFixed(1)} •
                                                P: {(parseFloat(item.protein || '0') * item.quantity).toFixed(1)}g •
                                                C: {(parseFloat(item.carbs || '0') * item.quantity).toFixed(1)}g •
                                                F: {(parseFloat(item.fat || '0') * item.quantity).toFixed(1)}g
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleQuantityChange(item, -1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            -
                                        </IconButton>
                                        <Typography>{item.quantity}</Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleQuantityChange(item, 1)}
                                        >
                                            +
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleSelectItem(item)}
                                            color="error"
                                        >
                                            ×
                                        </IconButton>
                                    </Box>
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                )}
            </Box>

            <NutritionGoalsDialog
                open={showGoalsDialog}
                onClose={handleCloseGoalsDialog}
                goals={nutritionGoals}
                onSave={handleSaveGoalsDialog}
            />
        </Paper>
    );
};

export default React.memo(SelectedItemsList); 
