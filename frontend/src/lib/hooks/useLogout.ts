'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { ROUTES } from '@/lib/constants/routes';

// Centralizes the logout side effect (clear the auth store, then navigate)
// so LogoutButton and the Navbar's account menu don't each reimplement it.
export function useLogout() {
  const router = useRouter();
  const { logout } = useAuth();

  return async function handleLogout() {
    try {
      await logout();
    } catch {
      // authStore.logout() already clears local state in its `finally`
      // block even if the backend call fails — nothing more to do here.
    }
    router.push(ROUTES.login);
  };
}
