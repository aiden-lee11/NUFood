import { Settings as SettingsIcon } from '@mui/icons-material';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { useDataStore } from '../../store';
import { NutritionGoals } from '../../types/ItemTypes';
import { getDefaultNutritionGoals, saveGoalsToStorage } from '../../util/nutrientPlannerUtils';

const NutritionGoalsSettings: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [goals, setGoals] = useState<NutritionGoals>(getDefaultNutritionGoals());
    const { UserDataResponse, saveNutritionGoals } = useDataStore();
    const { user, token } = useAuth();

    // Load goals from store when component mounts
    useEffect(() => {
        setGoals(UserDataResponse.nutritionGoals);
    }, [UserDataResponse.nutritionGoals]);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSave = async () => {
        // If user is authenticated, save to backend
        if (user && token) {
            await saveNutritionGoals(token, goals);
        } else {
            // Otherwise, save to local storage
            saveGoalsToStorage(goals);
        }
        handleClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Convert to number and ensure it's positive
        const numValue = Math.max(0, Number(value));
        setGoals(prevGoals => ({
            ...prevGoals,
            [name]: numValue
        }));
    };

    return (
        <>
            <IconButton
                onClick={handleOpen}
                color="primary"
                size="small"
                sx={{ ml: 1 }}
                aria-label="nutrition goals settings"
            >
                <SettingsIcon />
            </IconButton>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Nutrition Goals Settings
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Set your daily nutrition goals. These values will be used to calculate the percentage
                        of your daily goals achieved with your current meal plan.
                        {!user && (
                            <Box sx={{ mt: 1, fontWeight: 'bold', color: 'warning.main' }}>
                                You are not logged in. Goals will be saved to local storage only.
                            </Box>
                        )}
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            label="Calories (kcal)"
                            name="calories"
                            type="number"
                            value={goals.calories}
                            onChange={handleChange}
                            fullWidth
                            inputProps={{ min: 0 }}
                        />
                        <TextField
                            label="Protein (g)"
                            name="protein"
                            type="number"
                            value={goals.protein}
                            onChange={handleChange}
                            fullWidth
                            inputProps={{ min: 0 }}
                        />
                        <TextField
                            label="Carbohydrates (g)"
                            name="carbs"
                            type="number"
                            value={goals.carbs}
                            onChange={handleChange}
                            fullWidth
                            inputProps={{ min: 0 }}
                        />
                        <TextField
                            label="Fat (g)"
                            name="fat"
                            type="number"
                            value={goals.fat}
                            onChange={handleChange}
                            fullWidth
                            inputProps={{ min: 0 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        Save Goals
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default NutritionGoalsSettings; 