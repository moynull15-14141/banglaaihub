'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyDashboard } from '@/lib/api/users';

export function useMyDashboard() {
  return useQuery({
    queryKey: ['users', 'me', 'dashboard'],
    queryFn: getMyDashboard,
  });
}
