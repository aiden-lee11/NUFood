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

const NutritionGoalsDialog: React.FC<NutritionGoalsDialogProps> = ({
    open,
    onClose,
    goals,
    onSave
}) => {
    const [localGoals, setLocalGoals] = React.useState<EditableNutritionGoals>({
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat
    });

    React.useEffect(() => {
        setLocalGoals({
            calories: goals.calories,
            protein: goals.protein,
            carbs: goals.carbs,
            fat: goals.fat
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
                                value={localGoals.calories.toString()}
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
                                value={localGoals.protein.toString()}
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
                                value={localGoals.carbs.toString()}
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
                                value={localGoals.fat.toString()}
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