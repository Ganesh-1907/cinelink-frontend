import {useState, useCallback} from 'react';
import api from '../src/api/client';

export function usePagination(endpoint: string, pageSize = 15) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    try {
      const r = await api.get(`${endpoint}?page=${page}&limit=${pageSize}`);
      const items = r[Object.keys(r)[0]] || [];
      setData(prev => [...prev, ...items]);
      setHasMore(items.length >= pageSize);
      setPage(p => p + 1);
    } catch {} finally { setLoading(false); }
  }, [endpoint, page, pageSize, hasMore, loading]);

  return {data, loading, hasMore, loadMore, refresh: () => {setPage(0); setData([]); loadMore();}};
}
