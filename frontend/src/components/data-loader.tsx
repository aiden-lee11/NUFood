import { useAuth } from '@/context/AuthProvider';
import { useEffect } from 'react';
import { useDataStore } from '../store';

const DataLoader = ({ children }: { children: React.ReactNode }) => {
  const { fetchAllData, fetchGeneralData, fetchTodayData } = useDataStore();
  const { token, authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return; // Wait until auth state is known

    if (token) {
      fetchTodayData(token);
      fetchAllData(token);
    } else {
      fetchTodayData(null);
      fetchGeneralData();
    }
  }, [fetchAllData, fetchGeneralData, fetchTodayData, token, authLoading]);

  return <>{children}</>;
};

export default DataLoader;
