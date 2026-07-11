'use client';

import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyPinnedResources, usePinResource, useUnpinResource } from '@/lib/hooks/usePinnedResources';

const MAX_PINNED = 6;

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface PinResourceButtonProps {
  resourceId: string;
}

// Standalone toggle — used on the contributor's own resource rows (e.g.
// MySubmissionsView), independent of ResourceCard's existing prop surface so
// that shared component doesn't need a new pinned-specific action slot.
export function PinResourceButton({ resourceId }: PinResourceButtonProps) {
  const { data: pinned } = useMyPinnedResources();
  const pinMutation = usePinResource();
  const unpinMutation = useUnpinResource();

  const isPinned = pinned?.some((resource) => resource.id === resourceId) ?? false;
  const atLimit = (pinned?.length ?? 0) >= MAX_PINNED;

  function handleClick() {
    if (isPinned) {
      unpinMutation.mutate(resourceId, {
        onSuccess: () => toast.success('Unpinned from your profile.'),
        onError: (error) => toast.error(errorMessage(error, 'Could not unpin this resource.')),
      });
      return;
    }
    pinMutation.mutate(resourceId, {
      onSuccess: () => toast.success('Pinned to your profile.'),
      onError: (error) => toast.error(errorMessage(error, 'Could not pin this resource.')),
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pinMutation.isPending || unpinMutation.isPending || (!isPinned && atLimit)}
      title={!isPinned && atLimit ? `You can pin at most ${MAX_PINNED} resources.` : undefined}
      onClick={handleClick}
    >
      {isPinned ? (
        <PinOff className="size-3.5" aria-hidden="true" />
      ) : (
        <Pin className="size-3.5" aria-hidden="true" />
      )}
      {isPinned ? 'Unpin' : 'Pin'}
    </Button>
  );
}
