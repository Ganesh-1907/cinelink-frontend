import {useState, useEffect} from 'react';
import {getPremiumStatus} from '../src/services/dataService';

export function usePremiumStatus() {
  const [status, setStatus] = useState({
    tier: 'none', premiumTier: 'none', isPremium: false,
    isVerified: false, verifiedReal: false,
    expiryDate: null as Date | null,
    isExpiringSoon: false,
    loading: true, expiry: null as string | null,
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await getPremiumStatus();
        const tier = r.tier || 'none';
        const expiry = r.expiry ? new Date(r.expiry) : null;
        const expiringSoon = expiry ? (expiry.getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000 : false;
        setStatus({
          tier, premiumTier: tier, isPremium: tier !== 'none',
          isVerified: r.verifiedReal === true, verifiedReal: r.verifiedReal === true,
          expiryDate: expiry, expiry: r.expiry || null,
          isExpiringSoon: expiringSoon, loading: false,
        });
      } catch { setStatus(s => ({...s, loading: false})); }
    })();
  }, []);

  return status;
}
