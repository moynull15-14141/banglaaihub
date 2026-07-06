'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { ROUTES } from '@/lib/constants/routes';
import { LoadingScreen } from '@/components/common/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Client-side gate only — a UX convenience, not a security boundary. The
// backend's authenticate/authorize middleware is the actual enforcement point.
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace(ROUTES.login);
    }
  }, [isInitialized, isAuthenticated, router]);

  if (!isInitialized || !isAuthenticated) {
    return <LoadingScreen label="Checking your session…" />;
  }

  return <>{children}</>;
}
