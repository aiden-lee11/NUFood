import { useEffect } from 'react';
import { useDataStore } from '../store';
import { useAuth } from '@/context/AuthProvider';

const DataLoader = ({ children }: { children: React.ReactNode }) => {
  const { fetchAllData, fetchGeneralData, loading } = useDataStore();
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

  if (loading) {
    return <div>Loading data...</div>;
  }

  return <>{children}</>;
};

export default DataLoader;
