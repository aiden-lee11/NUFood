import React from 'react';
import { NutritionGoals } from '../../types/ItemTypes';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface NutritionGoalsDialogProps {
    open: boolean;
    onClose: () => void;
    goals: NutritionGoals;
    onSave: (goals: NutritionGoals) => void;
}

// Extend NutritionGoals to allow string values during editing
interface EditableNutritionGoals {
    calories: number | string;
    protein: number | string;
    carbs: number | string;
    fat: number | string;
}

// Default values for nutrition goals
const defaultGoals: NutritionGoals = {
    calories: 2000,
    protein: 50,
    carbs: 275,
    fat: 78
};

const NutritionGoalsDialog: React.FC<NutritionGoalsDialogProps> = ({
    open,
    onClose,
    goals,
    onSave
}) => {
    // Use default values if goals is undefined or specific properties are missing
    const safeGoals: NutritionGoals = {
        calories: goals?.calories ?? defaultGoals.calories,
        protein: goals?.protein ?? defaultGoals.protein,
        carbs: goals?.carbs ?? defaultGoals.carbs,
        fat: goals?.fat ?? defaultGoals.fat
    };

    const [localGoals, setLocalGoals] = React.useState<EditableNutritionGoals>({
        calories: safeGoals.calories,
        protein: safeGoals.protein,
        carbs: safeGoals.carbs,
        fat: safeGoals.fat
    });

    React.useEffect(() => {
        // Update localGoals when goals prop changes, using default values for any undefined properties
        setLocalGoals({
            calories: goals?.calories ?? defaultGoals.calories,
            protein: goals?.protein ?? defaultGoals.protein,
            carbs: goals?.carbs ?? defaultGoals.carbs,
            fat: goals?.fat ?? defaultGoals.fat
        });
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
            calories: localGoals.calories === '' ? 0 : Number(localGoals.calories) || 0,
            protein: localGoals.protein === '' ? 0 : Number(localGoals.protein) || 0,
            carbs: localGoals.carbs === '' ? 0 : Number(localGoals.carbs) || 0,
            fat: localGoals.fat === '' ? 0 : Number(localGoals.fat) || 0
        };
        onSave(finalGoals);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Set Nutrition Goals</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        Set your daily nutrition goals to track your progress
                    </p>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="calories">Daily Calories</Label>
                            <Input
                                id="calories"
                                type="number"
                                value={localGoals.calories?.toString() || '0'}
                                onChange={handleChange('calories')}
                                min={0}
                                placeholder="0"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="protein">Protein (g)</Label>
                            <Input
                                id="protein"
                                type="number"
                                value={localGoals.protein?.toString() || '0'}
                                onChange={handleChange('protein')}
                                min={0}
                                placeholder="0"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="carbs">Carbs (g)</Label>
                            <Input
                                id="carbs"
                                type="number"
                                value={localGoals.carbs?.toString() || '0'}
                                onChange={handleChange('carbs')}
                                min={0}
                                placeholder="0"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fat">Fat (g)</Label>
                            <Input
                                id="fat"
                                type="number"
                                value={localGoals.fat?.toString() || '0'}
                                onChange={handleChange('fat')}
                                min={0}
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Goals
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NutritionGoalsDialog; 