'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/authStore';
import { ROUTES } from '@/lib/constants/routes';

// Mounted once, globally, in providers.tsx. apiClient's response interceptor
// flips sessionExpired to true when a refresh attempt fails for a user who
// was actively signed in (as opposed to a visitor who was never
// authenticated) — see lib/api/client.ts.
export function SessionExpiredDialog() {
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const router = useRouter();

  function handleContinue() {
    useAuthStore.setState({ sessionExpired: false });
    router.push(ROUTES.login);
  }

  return (
    <Dialog open={sessionExpired}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Session expired</DialogTitle>
          <DialogDescription>Please sign in again to continue.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleContinue} className="w-full sm:w-auto">
            Continue to login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
