import {useState, useEffect} from 'react';
import {getProfile} from '../src/services/dataService';

export function useUserRole() {
  const [role, setRole] = useState('Actor');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await getProfile(); setRole(r.user?.role || 'Actor'); }
      catch {} finally { setLoading(false); }
    })();
  }, []);

  return {role, isActor: role === 'Actor', isDirector: role === 'Director', loading};
}
