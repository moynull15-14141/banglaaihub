'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface UseApiState<T> {
  data: T | null;
  error: unknown;
  isLoading: boolean;
}

// Generic escape hatch for one-off imperative calls that don't fit React
// Query's query/mutation model. Prefer useQuery/useMutation with apiClient
// directly for anything cacheable.
export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const request = useCallback(async (fn: (client: typeof apiClient) => Promise<T>) => {
    setState({ data: null, error: null, isLoading: true });
    try {
      const data = await fn(apiClient);
      setState({ data, error: null, isLoading: false });
      return data;
    } catch (error) {
      setState({ data: null, error, isLoading: false });
      throw error;
    }
  }, []);

  return { ...state, request, client: apiClient };
}
