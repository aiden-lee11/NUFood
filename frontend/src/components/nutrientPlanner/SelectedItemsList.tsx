import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Minus, Plus, Settings, X } from 'lucide-react';
import React, { useState } from 'react';
import { useDataStore } from '../../store';
import { DailyItem, NutritionGoals } from '../../types/ItemTypes';
import { SelectedDailyItem } from '../../util/nutrientPlannerUtils';
import NutritionGoalsDialog from './NutritionGoalsDialog';

// Helper function to format nutrition values
const formatNutritionValue = (value: string | number | undefined, quantity: number = 1): string => {
    if (value === undefined || value === null) return '0';

    // If it's already a string and contains "less than 1 gram"
    if (typeof value === 'string' && value.toLowerCase().includes('less than 1 gram')) {
        return value;
    }

    // For numeric values or string numbers, add 'g' suffix and apply quantity
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `${(numValue * quantity).toFixed(1)}g`;
};

interface SelectedItemsListProps {
    selectedItems: SelectedDailyItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    handleSelectItem: (item: DailyItem) => void;
    handleQuantityChange: (item: SelectedDailyItem, change: number) => void;
    setActiveTab: (tab: string) => void;
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
        <Card className="flex flex-col h-full overflow-hidden">
            <CardHeader className="p-4 space-y-0 border-b flex justify-between items-center">
                <h3 className="text-lg font-medium">My Food Plan</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenGoalsDialog}
                    title="Set Nutrition Goals"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </CardHeader>

            <div className="p-4 border-b">
                <h4 className="text-sm font-medium mb-2">Daily Totals</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Calories
                        </p>
                        <p className="font-medium">
                            {totalCalories.toFixed(1)} / {nutritionGoals.calories}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Protein
                        </p>
                        <p className="font-medium">
                            {totalProtein.toFixed(1)}g / {nutritionGoals.protein}g
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Carbs
                        </p>
                        <p className="font-medium">
                            {totalCarbs.toFixed(1)}g / {nutritionGoals.carbs}g
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Fat
                        </p>
                        <p className="font-medium">
                            {totalFat.toFixed(1)}g / {nutritionGoals.fat}g
                        </p>
                    </div>
                </div>
            </div>

            {/* Selected Items List */}
            <CardContent className="flex-grow overflow-y-auto p-4 min-h-0 pb-24">
                {selectedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <p className="text-sm text-muted-foreground text-center">
                            No items in your plan yet
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => setActiveTab("food-items")}
                            className="md:hidden"
                        >
                            Add Food Items
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 max-h-full">
                        {selectedItems.map((item, index) => (
                            <Card
                                key={`${item.Name}-${item.Location}-${item.TimeOfDay}-${index}`}
                                className="p-4 mb-4"
                            >
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                    <div className="flex-1">
                                        <h4 className="font-medium">{item.Name}</h4>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {item.Location} ({item.TimeOfDay})
                                        </p>
                                        <div className="flex flex-col space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="font-medium">Calories:</span>
                                                <span>{(parseFloat(item.calories || '0') * item.quantity).toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Protein:</span>
                                                <span>
                                                    {item.protein && item.protein.toLowerCase().includes('less than 1 gram')
                                                        ? item.protein
                                                        : formatNutritionValue(item.protein, item.quantity)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Carbs:</span>
                                                <span>
                                                    {item.carbs && item.carbs.toLowerCase().includes('less than 1 gram')
                                                        ? item.carbs
                                                        : formatNutritionValue(item.carbs, item.quantity)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Fat:</span>
                                                <span>
                                                    {item.fat && item.fat.toLowerCase().includes('less than 1 gram')
                                                        ? item.fat
                                                        : formatNutritionValue(item.fat, item.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 self-end sm:self-start">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleQuantityChange(item, -1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-6 text-center">{item.quantity}</span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleQuantityChange(item, 1)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => handleSelectItem(item)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>

            <NutritionGoalsDialog
                open={showGoalsDialog}
                onClose={handleCloseGoalsDialog}
                goals={nutritionGoals}
                onSave={handleSaveGoalsDialog}
            />
        </Card>
    );
};

export default React.memo(SelectedItemsList); 
