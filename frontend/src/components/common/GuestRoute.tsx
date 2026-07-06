'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { ROUTES } from '@/lib/constants/routes';
import { LoadingScreen } from '@/components/common/LoadingScreen';

interface GuestRouteProps {
  children: React.ReactNode;
}

// For (auth) pages such as login/register — redirects already-authenticated
// users away instead of showing the guest-only page again.
export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace(ROUTES.dashboard);
    }
  }, [isInitialized, isAuthenticated, router]);

  if (!isInitialized || isAuthenticated) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
