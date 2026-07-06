'use client';

import { useCallback, useState } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, initialLimit = 20 } = options;
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const nextPage = useCallback(() => setPage((current) => current + 1), []);
  const prevPage = useCallback(() => setPage((current) => Math.max(1, current - 1)), []);
  const reset = useCallback(() => setPage(initialPage), [initialPage]);

  return { page, limit, setPage, setLimit, nextPage, prevPage, reset };
}
