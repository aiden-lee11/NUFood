import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Minus, Plus, Settings, X } from 'lucide-react';
import React, { useState } from 'react';
import { cn } from '../../lib/utils';
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

// A single "Daily Totals" stat tile: macro label, big value / goal, a thin
// progress bar in the macro's chart color, and the goal percentage below.
interface MacroTileProps {
    label: string;
    value: number;
    goal: number;
    unit: string;
    barClass: string;
    textClass: string;
}

const MacroTile: React.FC<MacroTileProps> = ({ label, value, goal, unit, barClass, textClass }) => {
    const percent = goal > 0 ? Math.round((value / goal) * 100) : 0;
    const width = Math.max(0, Math.min(percent, 100));
    return (
        <div className="rounded-lg border bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold text-foreground">
                    {value.toFixed(1)}{unit}
                </span>
                <span className="text-xs text-muted-foreground">
                    / {goal}{unit}
                </span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full rounded-full", barClass)} style={{ width: `${width}%` }} />
            </div>
            <p className={cn("mt-1.5 text-xs font-medium", textClass)}>{percent}%</p>
        </div>
    );
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

    // Clear the whole plan by toggling each selected item off via the existing handler.
    const handleClearAll = () => {
        selectedItems.forEach(item => handleSelectItem(item));
    };

    return (
        <Card className="flex flex-col h-full overflow-hidden">
            <CardHeader className="p-4 space-y-0 border-b flex flex-row justify-between items-center gap-2">
                <h3 className="text-lg font-bold">My Food Plan</h3>
                <div className="flex items-center gap-1">
                    {selectedItems.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive font-semibold hover:text-destructive hover:bg-destructive/10"
                            onClick={handleClearAll}
                        >
                            Clear All
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary font-semibold gap-1.5 hover:text-primary hover:bg-primary/10"
                        onClick={handleOpenGoalsDialog}
                        title="Set Nutrition Goals"
                    >
                        <Settings className="h-4 w-4" />
                        Edit Goals
                    </Button>
                </div>
            </CardHeader>

            <div className="p-4 border-b">
                <h4 className="text-sm font-bold mb-3">Daily Totals</h4>
                <div className="grid grid-cols-2 gap-3">
                    <MacroTile
                        label="Calories"
                        value={totalCalories}
                        goal={nutritionGoals.calories}
                        unit=""
                        barClass="bg-chart-1"
                        textClass="text-chart-1"
                    />
                    <MacroTile
                        label="Protein"
                        value={totalProtein}
                        goal={nutritionGoals.protein}
                        unit="g"
                        barClass="bg-chart-2"
                        textClass="text-chart-2"
                    />
                    <MacroTile
                        label="Carbs"
                        value={totalCarbs}
                        goal={nutritionGoals.carbs}
                        unit="g"
                        barClass="bg-chart-3"
                        textClass="text-chart-3"
                    />
                    <MacroTile
                        label="Fat"
                        value={totalFat}
                        goal={nutritionGoals.fat}
                        unit="g"
                        barClass="bg-chart-4"
                        textClass="text-chart-4"
                    />
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
                    <div className="flex flex-col gap-3 max-h-full">
                        {selectedItems.map((item, index) => (
                            <Card
                                key={`${item.Name}-${item.Location}-${item.TimeOfDay}-${index}`}
                                className="p-4 border bg-card hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                            >
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-base font-semibold text-primary">{item.Name}</h4>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            {item.Location} ({item.TimeOfDay})
                                        </p>
                                        <div className="flex flex-col gap-1.5 text-sm">
                                            <div className="flex justify-between gap-3">
                                                <span className="text-muted-foreground">Portion Size:</span>
                                                <span className="text-foreground font-medium text-right">{item.portion || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <span className="text-muted-foreground">Calories:</span>
                                                <span className="text-foreground font-medium text-right">{(parseFloat(item.calories || '0') * item.quantity).toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <span className="text-muted-foreground">Protein:</span>
                                                <span className="text-foreground font-medium text-right">
                                                    {item.protein && item.protein.toLowerCase().includes('less than 1 gram')
                                                        ? item.protein
                                                        : formatNutritionValue(item.protein, item.quantity)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <span className="text-muted-foreground">Carbs:</span>
                                                <span className="text-foreground font-medium text-right">
                                                    {item.carbs && item.carbs.toLowerCase().includes('less than 1 gram')
                                                        ? item.carbs
                                                        : formatNutritionValue(item.carbs, item.quantity)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-3">
                                                <span className="text-muted-foreground">Fat:</span>
                                                <span className="text-foreground font-medium text-right">
                                                    {item.fat && item.fat.toLowerCase().includes('less than 1 gram')
                                                        ? item.fat
                                                        : formatNutritionValue(item.fat, item.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-3 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-full"
                                                onClick={() => handleQuantityChange(item, -1)}
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-5 text-center font-medium">{item.quantity}</span>
                                            <Button
                                                size="icon"
                                                className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                                                onClick={() => handleQuantityChange(item, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
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
