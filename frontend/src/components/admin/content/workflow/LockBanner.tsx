'use client';

import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { Lock, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useForceReleaseLock, useLockStatus } from '@/lib/hooks/useArticleLock';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatDate } from '@/lib/utils/format';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface LockBannerProps {
  slug: string;
  enabled: boolean;
}

// Poll-based "currently editing by" banner (see useArticleLock.ts — no
// WebSocket infra exists in this codebase). Shows nothing when unlocked or
// locked by the current user; shows a view-only warning plus an
// admin-only Force Unlock button when someone else holds it.
export function LockBanner({ slug, enabled }: LockBannerProps) {
  const { user } = useAuth();
  const { data } = useLockStatus(slug, enabled);
  const forceReleaseMutation = useForceReleaseLock(slug);
  const isAdmin = user?.roles.some((role) => role === 'admin' || role === 'super_admin') ?? false;

  if (!data?.locked || !data.lock || data.lock.locked_by.id === user?.id) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <Lock className="size-4" aria-hidden="true" />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>
          Currently editing by: <strong>{data.lock.locked_by.display_name ?? data.lock.locked_by.username}</strong>{' '}
          (since {formatDate(data.lock.locked_at)}). You&apos;re viewing in read-only mode.
        </span>
        {isAdmin ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            loading={forceReleaseMutation.isPending}
            onClick={() =>
              forceReleaseMutation.mutate(undefined, {
                onSuccess: () => toast.success('Lock force-released.'),
                onError: (error) => toast.error(errorMessage(error, 'Could not release this lock.')),
              })
            }
          >
            <ShieldAlert className="size-3" aria-hidden="true" />
            Force Unlock
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
