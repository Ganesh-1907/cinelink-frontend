import {useState, useEffect} from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {PremiumTier} from '../src/types';

interface PremiumStatus {
  isPremium: boolean;
  tier: PremiumTier;
  expiryDate: Date | null;
  isExpiringSoon: boolean;
  isVerified: boolean;
  loading: boolean;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function usePremiumStatus(): PremiumStatus {
  const [tier, setTier] = useState<PremiumTier>('none');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [isVerified, setIsVerified] = useState(false);
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
          setTier((data?.premiumTier as PremiumTier) || 'none');
          setExpiryDate(data?.premiumExpiry?.toDate() ?? null);
          setIsVerified(data?.verifiedReal === true);
          setLoading(false);
        },
        err => {
          console.warn('usePremiumStatus error:', err);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  const now = Date.now();
  const expiryMs = expiryDate?.getTime() ?? 0;
  const isPremium = tier !== 'none' && expiryMs > now;
  const isExpiringSoon = isPremium && expiryMs - now <= THREE_DAYS_MS;

  return {isPremium, tier, expiryDate, isExpiringSoon, isVerified, loading};
}
