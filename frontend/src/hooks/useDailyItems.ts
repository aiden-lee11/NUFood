import { useState, useEffect } from 'react';
import { fetchAllData, fetchGeneralData } from '../util/data';
import { Item, DailyItem, GeneralDataResponse, UserDataResponse } from '../types/ItemTypes';
import { LocationOperatingTimes } from '../types/OperationTypes';
import { getDailyLocationOperationTimes } from '../util/helper';

export const useDailyItems = (token: string | null, authLoading: boolean) => {
  const [locations, setLocations] = useState<string[]>([]);
  const [weeklyItems, setWeeklyItems] = useState<DailyItem[][]>([[]]);
  var [favorites, setFavorites] = useState<Item[]>([]);
  var [availableFavorites, setAvailableFavorites] = useState<DailyItem[]>([]);
  const [locationOperationHours, setLocationOperationHours] = useState<LocationOperatingTimes>();

  useEffect(() => {
    const processData = (data: GeneralDataResponse | UserDataResponse) => {
      const locations: string[] = Array.from(new Set(data.dailyItems?.map((item: DailyItem) => item.Location) || []));
      setLocations(locations);
      setWeeklyItems(data.weeklyItems || [[]]);

      if ('userPreferences' in data) {
        setFavorites(data.userPreferences?.map((item: Item) => item) || []);
        setAvailableFavorites(data.availableFavorites || []);
      }

      setLocationOperationHours(getDailyLocationOperationTimes(data.locationOperatingTimes));
    };

    const fetchData = async () => {
      if (!authLoading) {
        try {
          const data: GeneralDataResponse | UserDataResponse = token
            ? await fetchAllData(token)
            : await fetchGeneralData();
          processData(data);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };

    fetchData();
  }, [authLoading, token]);

  return { locations, weeklyItems, favorites, availableFavorites, locationOperationHours };
};
