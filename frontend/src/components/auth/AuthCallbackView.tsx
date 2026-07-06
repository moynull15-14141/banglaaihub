'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMe } from '@/lib/api/users';
import { useAuthStore } from '@/lib/store/authStore';
import { ROUTES } from '@/lib/constants/routes';
import { LoadingScreen } from '@/components/common/LoadingScreen';

const ADMIN_ROLES = ['admin', 'super_admin'];

// Lands here after the backend's Google OAuth redirect
// (`/auth/callback?accessToken=...`). The refresh token itself never reaches
// the client — it's already set as an httpOnly cookie by the backend before
// this redirect happens — so there is nothing here to store beyond the
// short-lived access token, which lives in the in-memory auth store like
// every other login path.
export function AuthCallbackView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      useAuthStore.getState().clear();
      router.replace(ROUTES.login);
      return;
    }

    useAuthStore.getState().setAccessToken(accessToken);

    getMe()
      .then((user) => {
        useAuthStore.getState().setUser(user);
        useAuthStore.setState({ isInitialized: true });
        const isAdmin = ADMIN_ROLES.some((role) => user.roles.includes(role));
        router.replace(isAdmin ? ROUTES.admin : ROUTES.home);
      })
      .catch(() => {
        useAuthStore.getState().clear();
        router.replace(ROUTES.login);
      });
  }, [router, searchParams]);

  return <LoadingScreen label="Authenticating… Please wait." />;
}
