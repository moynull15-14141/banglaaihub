'use client';

import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/api/users';
import { useAuthStore } from '@/lib/store/authStore';

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.user));
  const isInitialized = useAuthStore((state) => state.isInitialized);

  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: getMe,
    enabled: isInitialized && isAuthenticated,
  });
}
