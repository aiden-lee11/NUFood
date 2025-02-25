import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export const useAuthToken = () => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Monitor the auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Fetch a fresh token for the authenticated user
        const freshToken = await currentUser.getIdToken(true);
        setToken(freshToken);

        // Listen for token changes and refresh token when it changes
        const tokenUnsubscribe = auth.onIdTokenChanged(async (user) => {
          if (user) {
            const updatedToken = await user.getIdToken();
            setToken(updatedToken);
          } else {
            setToken(null);
          }
        });

        return () => tokenUnsubscribe();
      } else {
        setToken(null);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return { user, authLoading, token };
};
