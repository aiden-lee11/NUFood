import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography
} from '@mui/material';
import React from 'react';
import { NutritionGoals } from '../../types/ItemTypes';

interface NutritionGoalsDialogProps {
    open: boolean;
    onClose: () => void;
    goals: NutritionGoals;
    onSave: (goals: NutritionGoals) => void;
}

const NutritionGoalsDialog: React.FC<NutritionGoalsDialogProps> = ({
    open,
    onClose,
    goals,
    onSave
}) => {
    const [localGoals, setLocalGoals] = React.useState<Partial<NutritionGoals>>(goals);

    React.useEffect(() => {
        setLocalGoals(goals);
    }, [goals]);

    const handleChange = (field: keyof NutritionGoals) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        setLocalGoals(prev => ({
            ...prev,
            [field]: inputValue === '' ? '' : parseInt(inputValue)
        }));
    };

    const handleSave = () => {
        // Convert empty values to 0 only when saving
        const finalGoals: NutritionGoals = {
            calories: localGoals.calories === '' ? 0 : localGoals.calories || 0,
            protein: localGoals.protein === '' ? 0 : localGoals.protein || 0,
            carbs: localGoals.carbs === '' ? 0 : localGoals.carbs || 0,
            fat: localGoals.fat === '' ? 0 : localGoals.fat || 0
        };
        onSave(finalGoals);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Set Nutrition Goals</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Set your daily nutrition goals to track your progress
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <TextField
                            label="Daily Calories"
                            type="number"
                            value={localGoals.calories === '' ? '' : localGoals.calories}
                            onChange={handleChange('calories')}
                            fullWidth
                            InputProps={{
                                inputProps: { min: 0 }
                            }}
                            placeholder="0"
                        />
                        <TextField
                            label="Protein (g)"
                            type="number"
                            value={localGoals.protein === '' ? '' : localGoals.protein}
                            onChange={handleChange('protein')}
                            fullWidth
                            InputProps={{
                                inputProps: { min: 0 }
                            }}
                            placeholder="0"
                        />
                        <TextField
                            label="Carbs (g)"
                            type="number"
                            value={localGoals.carbs === '' ? '' : localGoals.carbs}
                            onChange={handleChange('carbs')}
                            fullWidth
                            InputProps={{
                                inputProps: { min: 0 }
                            }}
                            placeholder="0"
                        />
                        <TextField
                            label="Fat (g)"
                            type="number"
                            value={localGoals.fat === '' ? '' : localGoals.fat}
                            onChange={handleChange('fat')}
                            fullWidth
                            InputProps={{
                                inputProps: { min: 0 }
                            }}
                            placeholder="0"
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Save Goals
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NutritionGoalsDialog; 