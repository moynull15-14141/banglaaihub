'use client';

import { useAuthStore } from '@/lib/store/authStore';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    accessToken,
    isAuthenticated: Boolean(user),
    isLoading,
    isInitialized,
    login,
    logout,
  };
}
