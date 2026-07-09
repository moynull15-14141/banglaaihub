'use client';

import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';
import { useForkResource } from '@/lib/hooks/useResources';
import { hasContributorAccess } from '@/lib/constants/roles';
import { ROUTES } from '@/lib/constants/routes';
import type { Resource } from '@/types/resource';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface ForkPromptButtonProps {
  resource: Resource;
}

// Phase 3A.1, Part 1. Prompt-only (Model has version history, not forking).
// Hidden entirely — not disabled — when the viewer can't act on it: not an
// approved prompt, or the account can't create resources. This is a UX
// convenience only; the real gate is the backend's resource:create permission
// check on POST /resources/:slug/fork.
export function ForkPromptButton({ resource }: ForkPromptButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const forkMutation = useForkResource();

  if (resource.type !== 'prompt' || resource.status !== 'approved') return null;
  if (!hasContributorAccess(user?.roles ?? [])) return null;

  function handleFork() {
    forkMutation.mutate(resource.slug, {
      onSuccess: (result) => {
        toast.success('Prompt forked successfully.');
        router.push(ROUTES.editResource(result.slug));
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not fork this prompt.')),
    });
  }

  return (
    <Button type="button" variant="outline" loading={forkMutation.isPending} onClick={handleFork}>
      <GitFork className="size-4" aria-hidden="true" />
      Fork Prompt
    </Button>
  );
}
