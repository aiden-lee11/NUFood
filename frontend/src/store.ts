import { create } from "zustand";
import { Item, NutritionGoals, UserDataResponse } from "./types/ItemTypes";

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

interface DataState {
  UserDataResponse: UserDataResponse;
  nutritionGoals: NutritionGoals;
  loading: boolean;
  error: string | null;
  hasFetchedAllData: boolean; // flag for all data fetch
  hasFetchedGeneralData: boolean; // flag for general data fetch
  hasFetchedOperatingTimes: boolean; // flag for operating times
  fetchAllData: (userToken: string | null) => Promise<void>;
  fetchGeneralData: () => Promise<void>;
  fetchNutritionGoals: (userToken: string) => Promise<void>;
  saveNutritionGoals: (userToken: string, goals: NutritionGoals) => Promise<void>;
  setUserPreferences: (userPreferences: Item[]) => void;
  updateNutritionGoals: (goals: NutritionGoals) => void;
}

const fetchData = async (endpoint: string, authToken?: string) => {
  const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  return await response.json();
};

export const useDataStore = create<DataState>((set, get) => ({
  // initial state
  UserDataResponse: {
    allItems: [],
    weeklyItems: {},
    dailyItemsWithNutrients: [],
    userPreferences: [],
    locationOperationHours: [],
    mailing: false,
  },
  nutritionGoals: {
    calories: 2000, // Default values
    protein: 50,
    carbs: 275,
    fat: 78
  },
  loading: false,
  error: null,
  hasFetchedAllData: false,
  hasFetchedGeneralData: false,
  hasFetchedOperatingTimes: false,

  fetchAllData: async (userToken: string | null) => {
    // If data is already fetched, exit early
    if (get().hasFetchedAllData) return;

    set({ loading: true, error: null });
    try {
      const allData = await fetchData(`${API_URL}/api/allData`, userToken || undefined);
      set({
        UserDataResponse: {
          ...get().UserDataResponse,
          allItems: allData.allItems || [],
          weeklyItems: allData.weeklyItems || {},
          dailyItemsWithNutrients: allData.dailyItemsWithNutrients || [],
          userPreferences: allData.userPreferences || [],
          locationOperationHours: allData.locationOperatingTimes || [],
          mailing: allData.mailing ?? false,
        },
        loading: false,
        hasFetchedAllData: true,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchGeneralData: async () => {
    if (get().hasFetchedGeneralData) return;

    set({ loading: true, error: null });
    try {
      const generalData = await fetchData(`${API_URL}/api/generalData`);
      set({
        UserDataResponse: {
          ...get().UserDataResponse,
          allItems: generalData.allItems || [],
          weeklyItems: generalData.weeklyItems || {},
          dailyItemsWithNutrients: generalData.dailyItemsWithNutrients || [],
          locationOperationHours: generalData.locationOperatingTimes || [],
          userPreferences: null,
          mailing: false
        },
        loading: false,
        hasFetchedGeneralData: true,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchNutritionGoals: async (userToken: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetchData(`${API_URL}/api/nutritionGoals`, userToken);
      console.log('Fetched nutrition goals from backend:', response);

      // Map backend PascalCase keys to frontend camelCase keys
      const mappedGoals: NutritionGoals = {
        calories: response.Calories ?? get().nutritionGoals.calories, // Fallback to current state or defaults
        protein: response.Protein ?? get().nutritionGoals.protein,
        carbs: response.Carbs ?? get().nutritionGoals.carbs,
        fat: response.Fat ?? get().nutritionGoals.fat,
      };

      set({
        nutritionGoals: mappedGoals, // Use the correctly mapped object
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  saveNutritionGoals: async (userToken: string, goals: NutritionGoals) => {
    set({ loading: true, error: null });
    try {
      const headers = {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      };
      const response = await fetch(`${API_URL}/api/nutritionGoals`, {
        method: 'POST',
        headers,
        body: JSON.stringify(goals)
      });

      if (!response.ok) {
        throw new Error(`Failed to save nutrition goals: ${response.statusText}`);
      }

      set({
        nutritionGoals: goals,
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  setUserPreferences: (newPreferences: Item[]) => {
    set({
      UserDataResponse: {
        ...get().UserDataResponse,
        userPreferences: newPreferences,
      },
    });
  },

  updateNutritionGoals: (goals: NutritionGoals) => {
    set({
      nutritionGoals: goals,
    });
  },
}));
