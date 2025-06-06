import { useState, useEffect, useCallback } from 'react';

interface UsePageDataOptions<T> {
  loadFn: () => Promise<T>;
  deps?: any[];
  delay?: number;
}

export function usePageData<T>({ loadFn, deps = [], delay = 0 }: UsePageDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add artificial delay to prevent flash of loading state
      if (delay > 0 && isInitialLoad) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await loadFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [loadFn, delay, isInitialLoad]);

  useEffect(() => {
    load();
  }, deps);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { data, loading, error, isInitialLoad, refresh };
}