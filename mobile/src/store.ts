import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './utils';
import { GeneralDataResponse } from './types';

type DataState = {
  allItems: string[];
  weeklyItems: GeneralDataResponse['weeklyItems'];
  locationOperatingTimes: GeneralDataResponse['locationOperatingTimes'];
  loading: boolean;
  error: string | null;
  lastFetchedISO: string | null;
  fetchGeneralDataOncePerDay: () => Promise<void>;
};

const CACHE_KEY = 'generalDataCache_v1';

export const useDataStore = create<DataState>((set, get) => ({
  allItems: [],
  weeklyItems: {},
  locationOperatingTimes: [],
  loading: false,
  error: null,
  lastFetchedISO: null,

  fetchGeneralDataOncePerDay: async () => {
    // If we already fetched today, skip
    const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as { data: GeneralDataResponse; fetchedAt: string };
        const last = new Date(cached.fetchedAt);
        const now = new Date();
        const sameDay =
          last.getFullYear() === now.getFullYear() &&
          last.getMonth() === now.getMonth() &&
          last.getDate() === now.getDate();
        if (sameDay) {
          set({
            allItems: cached.data.allItems || [],
            weeklyItems: cached.data.weeklyItems || {},
            locationOperatingTimes: cached.data.locationOperatingTimes || [],
            lastFetchedISO: cached.fetchedAt,
            loading: false,
            error: null,
          });
          return;
        }
      } catch {}
    }

    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/generalData`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: GeneralDataResponse = await response.json();
      const fetchedAt = new Date().toISOString();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt }));
      set({
        allItems: data.allItems || [],
        weeklyItems: data.weeklyItems || {},
        locationOperatingTimes: data.locationOperatingTimes || [],
        lastFetchedISO: fetchedAt,
        loading: false,
        error: null,
      });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },
}));


