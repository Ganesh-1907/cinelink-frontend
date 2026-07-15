import { useState, useCallback, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

interface PaginationOptions {
  collection: string;
  limit?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  whereConditions?: {
    field: string;
    operator: FirebaseFirestoreTypes.WhereFilterOp;
    value: any;
  }[];
  pageSize?: number;
}

interface PaginationResult<T> {
  data: T[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePagination<T extends { id: string }>(
  options: PaginationOptions,
): PaginationResult<T> {
  const {
    collection,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    pageSize = 15,
    whereConditions = [],
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<FirebaseFirestoreTypes.DocumentSnapshot | null>(null);

  const buildQuery = useCallback(
    (isLoadMore = false) => {
      let query: FirebaseFirestoreTypes.CollectionReference |
        FirebaseFirestoreTypes.Query = firestore().collection(collection);

      whereConditions.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });

      query = query.orderBy(orderByField, orderDirection).limit(pageSize);

      if (isLoadMore && lastDoc) {
        query = query.startAfter(lastDoc);
      }

      return query.get();
    },
    [collection, orderByField, orderDirection, pageSize, whereConditions, lastDoc],
  );

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const snapshot = await buildQuery(!isRefresh && lastDoc !== null);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

      if (isRefresh || lastDoc === null) {
        setData(items);
      } else {
        setData(prev => [...prev, ...items]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length >= pageSize);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildQuery, lastDoc, pageSize]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore && !refreshing) {
      await fetchData();
    }
  }, [loading, hasMore, refreshing, fetchData]);

  const refresh = useCallback(async () => {
    setLastDoc(null);
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, refreshing, hasMore, error, loadMore, refresh };
}

export function useInfiniteScroll<T extends { id: string }>(
  options: PaginationOptions,
) {
  const pagination = usePagination<T>(options);

  const onEndReached = () => {
    pagination.loadMore();
  };

  const onRefresh = () => {
    pagination.refresh();
  };

  return { ...pagination, onEndReached, onRefresh };
}
