import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { User, PremiumTier } from '../types';

interface AppState {
  user: any | null;
  userData: User | null;
  premiumTier: PremiumTier;
  premiumExpiry: Date | null;
  isPremium: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  role: string;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState>({
  user: null,
  userData: null,
  premiumTier: 'none',
  premiumExpiry: null,
  isPremium: false,
  isVerified: false,
  isAdmin: false,
  role: 'Actor',
  loading: true,
  refreshUserData: async () => {},
  signOut: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [premiumTier, setPremiumTier] = useState<PremiumTier>('none');
  const [premiumExpiry, setPremiumExpiry] = useState<Date | null>(null);
  const [role, setRole] = useState('Actor');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string) => {
    try {
      const doc = await firestore().collection('users').doc(uid).get();
      if (doc.exists) {
        const data = doc.data() as User;
        setUserData(data);
        setPremiumTier(data.premiumTier || 'none');
        setPremiumExpiry(data.premiumExpiry?.toDate?.() || null);
        setRole(data.role || 'Actor');

        const adminEmail = 'anilkumardevarakonda03@gmail.com';
        setIsAdmin(data.isAdmin === true || auth().currentUser?.email === adminEmail);
      }
    } catch (e) {
      console.warn('[AppContext] fetchUserData error:', e);
    }
  };

  const refreshUserData = async () => {
    if (user?.uid) await fetchUserData(user.uid);
  };

  const signOut = async () => {
    await auth().signOut();
    setUser(null);
    setUserData(null);
    setPremiumTier('none');
    setPremiumExpiry(null);
    setRole('Actor');
    setIsAdmin(false);
  };

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        await fetchUserData(authUser.uid);
      } else {
        setUserData(null);
        setPremiumTier('none');
        setPremiumExpiry(null);
        setRole('Actor');
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return subscriber;
  }, []);

  const isPremium = premiumTier !== 'none';
  const isVerified = userData?.verifiedReal === true;

  return (
    <AppContext.Provider
      value={{
        user,
        userData,
        premiumTier,
        premiumExpiry,
        isPremium,
        isVerified,
        isAdmin,
        role,
        loading,
        refreshUserData,
        signOut,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

export default AppContext;
