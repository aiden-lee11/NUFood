import { useEffect, useRef } from 'react';
import { useDataStore } from '../store';
import { useAuth } from '@/context/AuthProvider';

const DataLoader = ({ children }: { children: React.ReactNode }) => {
  const { fetchAllData, fetchGeneralData, clearUserData, hasFetchedAllData, hasFetchedGeneralData } = useDataStore();
  const { token, authLoading } = useAuth();
  const prevTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      const prevToken = prevTokenRef.current;
      
      // Detect sign-out: previous token existed but current token is null
      if (prevToken && !token) {
        clearUserData();
      }
      // Normal auth state handling
      else if (token) {
        fetchAllData(token);
      } else if (!token && !prevToken) {
        // Initial load with no token
        fetchGeneralData();
      }
      
      // Update the ref for next comparison
      prevTokenRef.current = token;
    }
  }, [fetchAllData, fetchGeneralData, clearUserData, token, authLoading, hasFetchedAllData, hasFetchedGeneralData]);

  return <>{children}</>;
};

export default DataLoader;
