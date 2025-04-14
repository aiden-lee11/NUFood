import { create } from "zustand";
import { Item, UserDataResponse } from "./types/ItemTypes";

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
  setUserPreferences: (userPreferences: Item[]) => void;
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

  setUserPreferences: (newPreferences: Item[]) => {
    set({
      UserDataResponse: {
        ...get().UserDataResponse,
        userPreferences: newPreferences,
      },
    });
  },
}));
