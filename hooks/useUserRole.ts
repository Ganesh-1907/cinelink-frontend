import {useState, useEffect} from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export type UserRole = 'actor' | 'director' | 'admin' | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        snap => {
          const data = snap.data();
          setRole((data?.role as UserRole) || null);
          setLoading(false);
        },
        err => {
          console.warn('useUserRole error:', err);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  return {
    role,
    loading,
    isActor: role === 'actor',
    isDirector: role === 'director',
    isAdmin: role === 'admin',
    canPostAudition: role === 'director' || role === 'admin',
    canQuickPost: role === 'admin',
  };
}