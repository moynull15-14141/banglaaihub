'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/lib/store/authStore';
import { getMe } from '@/lib/api/users';
import { SessionExpiredDialog } from '@/components/auth/SessionExpiredDialog';
import { MessagingDock } from '@/components/messaging/MessagingDock';

interface ProvidersProps {
  children: React.ReactNode;
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  // The access token lives only in memory, so it's lost on every full page
  // load. This silently attempts one refresh using the HTTP-only cookie to
  // restore the session, then hydrates the user so isAuthenticated
  // (Boolean(user)) reflects the restored session instead of staying false
  // until a login/OAuth callback runs — otherwise ProtectedRoute would bounce
  // an already-signed-in user back to /login on every reload.
  useEffect(() => {
    useAuthStore
      .getState()
      .refreshToken()
      .then(() => getMe())
      .then((user) => useAuthStore.getState().setUser(user))
      .catch(() => {
        useAuthStore.setState({ isInitialized: true });
      });
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <AuthBootstrap>{children}</AuthBootstrap>
          <SessionExpiredDialog />
          <MessagingDock />
          <Toaster />
          {process.env.NODE_ENV === 'development' ? (
            <ReactQueryDevtools initialIsOpen={false} />
          ) : null}
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
