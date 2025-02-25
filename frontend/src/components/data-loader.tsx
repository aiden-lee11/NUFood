import { useEffect } from 'react';
import { useDataStore } from '../store';
import { useAuth } from '@/context/AuthProvider';

const DataLoader = ({ children }: { children: React.ReactNode }) => {
  const { fetchAllData, fetchGeneralData } = useDataStore();
  const { token, authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (token) {
        fetchAllData(token);
      } else {
        fetchGeneralData();
      }
    }
  }, [fetchAllData, token, authLoading]);

  return <>{children}</>;
};

export default DataLoader;
