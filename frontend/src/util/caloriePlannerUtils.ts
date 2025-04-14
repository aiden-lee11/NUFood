import { DailyItem } from '../types/ItemTypes';

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

// Initialize state from session storage
export const getSavedItemsFromStorage = (): SelectedDailyItem[] => {
    try {
        const savedItems = sessionStorage.getItem('calorieplannerItems');
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