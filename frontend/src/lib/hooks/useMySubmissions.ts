'use client';

import { useQuery } from '@tanstack/react-query';
import { listMySubmissions, type ListMySubmissionsParams } from '@/lib/api/users';

export function useMySubmissions(params: ListMySubmissionsParams = {}) {
  return useQuery({
    queryKey: ['users', 'me', 'submissions', params],
    queryFn: () => listMySubmissions(params),
  });
}
