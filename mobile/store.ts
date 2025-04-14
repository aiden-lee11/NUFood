import { create } from 'zustand';
import { Item, WeeklyItemsMap } from './types/ItemTypes';

interface DataStore {
    weeklyItems: WeeklyItemsMap;
    allItems: Item[];
    userPreferences: Item[];
    locationOperationHours: any[];
    mailing: boolean;
    loading: boolean;
    error: string | null;
    fetchAllData: (token: string | null) => Promise<void>;
    fetchGeneralData: () => Promise<void>;
    setUserPreferences: (preferences: Item[]) => void;
}

// Use environment variable or fallback to localhost
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';

export const useDataStore = create<DataStore>((set) => ({
    weeklyItems: {},
    allItems: [],
    userPreferences: [],
    locationOperationHours: [],
    mailing: false,
    loading: false,
    error: null,

    fetchAllData: async (token: string | null) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/api/allData`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            set({
                weeklyItems: data.weeklyItems || {},
                allItems: data.allItems || [],
                userPreferences: data.userPreferences || [],
                locationOperationHours: data.locationOperationHours || [],
                mailing: data.mailing || false,
                loading: false,
            });
        } catch (error) {
            console.error('Error fetching all data:', error);
            set({ error: 'Failed to fetch data', loading: false });
        }
    },

    fetchGeneralData: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/api/generalData`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            set({
                weeklyItems: data.weeklyItems || {},
                allItems: data.allItems || [],
                locationOperationHours: data.locationOperationHours || [],
                loading: false,
            });
        } catch (error) {
            console.error('Error fetching general data:', error);
            set({ error: 'Failed to fetch data', loading: false });
        }
    },

    setUserPreferences: (preferences: Item[]) => {
        set({ userPreferences: preferences });
    },
})); 