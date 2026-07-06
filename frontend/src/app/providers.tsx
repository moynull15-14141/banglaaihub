'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/lib/store/authStore';

interface ProvidersProps {
  children: React.ReactNode;
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  // The access token lives only in memory, so it's lost on every full page
  // load. This silently attempts one refresh using the HTTP-only cookie to
  // restore the session; a failure just means the user is logged out.
  useEffect(() => {
    useAuthStore
      .getState()
      .refreshToken()
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
        <AuthBootstrap>{children}</AuthBootstrap>
        <Toaster />
        {process.env.NODE_ENV === 'development' ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
