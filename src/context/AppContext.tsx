import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import auth from '@react-native-firebase/auth';
import api, { setJwtToken } from '../api/client';
import { loadSavedSession, logout as authLogout } from '../services/authService';

interface UserData {
  _id: string; email?: string; fullName?: string; displayName?: string;
  photoUrl?: string; role?: string; bio?: string; location?: string;
  premiumTier: string; premiumExpiry?: string; verifiedReal: boolean;
  isAdmin: boolean; isApprovedDirector: boolean;
  phone?: string; fcmToken?: string;
}

interface AppState {
  user: any | null;
  userData: UserData | null;
  premiumTier: string;
  isPremium: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  role: string;
  isApprovedDirector: boolean;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState>({
  user: null, userData: null, premiumTier: 'none',
  isPremium: false, isVerified: false, isAdmin: false,
  role: 'Actor', isApprovedDirector: false, loading: true,
  refreshUserData: async () => {}, signOut: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      const res = await api.get<{ user: UserData }>('/users/profile');
      const data = res.user;
      setUserData(data);
      return data;
    } catch (e) {
      console.warn('[AppContext] fetchUserData error:', e);
      return null;
    }
  };

  const refreshUserData = async () => { await fetchUserData(); };

  const signOut = async () => {
    await authLogout();
    try { await auth().signOut(); } catch {}
    setUser(null);
    setUserData(null);
  };

  useEffect(() => {
    (async () => {
      const savedUser = await loadSavedSession();
      if (savedUser) {
        setUser(savedUser);
        await fetchUserData();
      }
      setLoading(false);
    })();
  }, []);

  // Legacy Firebase auth listener for backward compat
  useEffect(() => {
    const unsub = auth().onAuthStateChanged(async (fbUser) => {
      if (fbUser && !user) {
        setUser(fbUser);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const ud = userData;
  const premiumTier = ud?.premiumTier || 'none';
  const isPremium = premiumTier !== 'none';
  const isVerified = ud?.verifiedReal === true;
  const isAdmin = ud?.isAdmin === true;
  const role = ud?.role || 'Actor';
  const isApprovedDirector = ud?.isApprovedDirector === true;

  return (
    <AppContext.Provider value={{
      user, userData, premiumTier, isPremium,
      isVerified, isAdmin, role, isApprovedDirector,
      loading, refreshUserData, signOut,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
export default AppContext;
