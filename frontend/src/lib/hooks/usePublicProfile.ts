'use client';

import { useQuery } from '@tanstack/react-query';
import { getPublicProfile } from '@/lib/api/users';

export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['users', 'profile', username],
    queryFn: () => getPublicProfile(username),
    enabled: Boolean(username),
  });
}
