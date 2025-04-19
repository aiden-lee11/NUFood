import { DailyItem, NutritionGoals } from '../types/ItemTypes';

// Extended Item type with quantity for selected items
export interface SelectedDailyItem extends DailyItem {
    quantity: number;
}

// Custom type definitions
export type SortKey = 'Name' | 'Calories' | 'Protein' | 'Carbs' | 'Fat';
export type SortDirection = 'asc' | 'desc';

// Helper function to properly format nutrient values
export const getNutrientDisplay = (value: string | undefined, quantity: number, unit: string = '') => {
    if (!value || value === 'NaN' || value === 'NaNg' || value === 'undefined') {
        return 'N/A';
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
        return 'N/A';
    }

    return `${(numValue * quantity).toFixed(1)}${unit}`;
};

// Calculate nutrition percentage based on general daily values
export const calculatePercentage = (value: number, dailyValue: number) => {
    return Math.round((value / dailyValue) * 100);
};

// Calculate nutrition percentage based on user goals
export const calculateGoalPercentage = (value: number, goals: NutritionGoals, nutrientType: keyof NutritionGoals) => {
    const goalValue = goals[nutrientType];
    if (!goalValue || goalValue === 0) {
        // Fall back to default values if no goal is set
        switch (nutrientType) {
            case 'calories':
                return calculatePercentage(value, 2000);
            case 'protein':
                return calculatePercentage(value, 50);
            case 'carbs':
                return calculatePercentage(value, 275);
            case 'fat':
                return calculatePercentage(value, 78);
            default:
                return 0;
        }
    }
    return Math.round((value / goalValue) * 100);
};

// Get default nutrition goals
export const getDefaultNutritionGoals = (): NutritionGoals => {
    return {
        calories: 2000,
        protein: 50,
        carbs: 275,
        fat: 78
    };
};

// Get nutrition goals from local storage
export const getSavedGoalsFromStorage = (): NutritionGoals => {
    try {
        const savedGoals = localStorage.getItem('nutritionGoals');
        return savedGoals ? JSON.parse(savedGoals) : getDefaultNutritionGoals();
    } catch (e) {
        console.error('Error loading saved goals from localStorage', e);
        return getDefaultNutritionGoals();
    }
};

// Save nutrition goals to local storage
export const saveGoalsToStorage = (goals: NutritionGoals) => {
    try {
        localStorage.setItem('nutritionGoals', JSON.stringify(goals));
    } catch (e) {
        console.error('Error saving goals to localStorage', e);
    }
};

// Initialize state from session storage
export const getSavedItemsFromStorage = (): SelectedDailyItem[] => {
    try {
        const savedItems = sessionStorage.getItem('nutrientplannerItems');
        return savedItems ? JSON.parse(savedItems) : [];
    } catch (e) {
        console.error('Error loading saved items from sessionStorage', e);
        return [];
    }
};

// Calculate totals for nutrition values
export const calculateNutritionTotals = (items: SelectedDailyItem[]) => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    items.forEach(item => {
        // Handle NaN values by converting them to 0
        const itemCalories = parseFloat(item.calories || '0');
        const itemProtein = parseFloat(item.protein || '0');
        const itemCarbs = parseFloat(item.carbs || '0');
        const itemFat = parseFloat(item.fat || '0');

        calories += !isNaN(itemCalories) ? itemCalories * item.quantity : 0;
        protein += !isNaN(itemProtein) ? itemProtein * item.quantity : 0;
        carbs += !isNaN(itemCarbs) ? itemCarbs * item.quantity : 0;
        fat += !isNaN(itemFat) ? itemFat * item.quantity : 0;
    });

    return { calories, protein, carbs, fat };
}; 