import { create } from "zustand";
import { Item, NutritionGoals, UserDataResponse } from "./types/ItemTypes";

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

interface DataState {
  UserDataResponse: UserDataResponse;
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

// Default nutrition goals
const defaultNutritionGoals: NutritionGoals = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 78
};

export const useDataStore = create<DataState>((set, get) => ({
  // initial state
  UserDataResponse: {
    allItems: [],
    weeklyItems: {},
    userPreferences: [],
    locationOperationHours: [],
    mailing: false,
    nutritionGoals: defaultNutritionGoals,
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

      // Extract and map nutrition goals (PascalCase from backend to camelCase for frontend)
      const rawGoals = allData.nutritionGoals;
      const mappedGoals: NutritionGoals = {
        calories: rawGoals?.Calories ?? defaultNutritionGoals.calories,
        protein: rawGoals?.Protein ?? defaultNutritionGoals.protein,
        carbs: rawGoals?.Carbs ?? defaultNutritionGoals.carbs,
        fat: rawGoals?.Fat ?? defaultNutritionGoals.fat
      };

      set({
        UserDataResponse: {
          ...get().UserDataResponse,
          allItems: allData.allItems || [],
          weeklyItems: allData.weeklyItems || {},
          userPreferences: allData.userPreferences || [],
          locationOperationHours: allData.locationOperatingTimes || [],
          mailing: allData.mailing ?? false,
          nutritionGoals: mappedGoals, // Use the mapped goals
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

      // Extract and map nutrition goals (PascalCase from backend to camelCase for frontend)
      const rawGoals = generalData.nutritionGoals;
      const mappedGoals: NutritionGoals = {
        calories: rawGoals?.Calories ?? defaultNutritionGoals.calories,
        protein: rawGoals?.Protein ?? defaultNutritionGoals.protein,
        carbs: rawGoals?.Carbs ?? defaultNutritionGoals.carbs,
        fat: rawGoals?.Fat ?? defaultNutritionGoals.fat
      };

      set({
        UserDataResponse: {
          ...get().UserDataResponse,
          allItems: generalData.allItems || [],
          weeklyItems: generalData.weeklyItems || {},
          locationOperationHours: generalData.locationOperatingTimes || [],
          userPreferences: null,
          mailing: false,
          nutritionGoals: mappedGoals, // Use the mapped goals
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
        calories: response.Calories ?? get().UserDataResponse.nutritionGoals.calories,
        protein: response.Protein ?? get().UserDataResponse.nutritionGoals.protein,
        carbs: response.Carbs ?? get().UserDataResponse.nutritionGoals.carbs,
        fat: response.Fat ?? get().UserDataResponse.nutritionGoals.fat,
      };

      set({
        UserDataResponse: {
          ...get().UserDataResponse,
          nutritionGoals: mappedGoals,
        },
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
        UserDataResponse: {
          ...get().UserDataResponse,
          nutritionGoals: goals,
        },
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
      UserDataResponse: {
        ...get().UserDataResponse,
        nutritionGoals: goals,
      },
    });
  },
}));
