'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { BadgeGrid } from '@/components/user/BadgeGrid';
import { BadgeFormDialog } from '@/components/admin/badges/BadgeFormDialog';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import {
  useAdminBadgeCatalog,
  useCreateBadge,
  useDeleteBadge,
  useUpdateBadge,
} from '@/lib/hooks/useBadges';
import type { Badge } from '@/types/badge';

export function BadgesView() {
  const { data: badges, isLoading, isError, refetch } = useAdminBadgeCatalog();
  const createMutation = useCreateBadge();
  const updateMutation = useUpdateBadge();
  const deleteMutation = useDeleteBadge();

  const [formTarget, setFormTarget] = useState<Badge | null | undefined>(undefined); // undefined = closed
  const [deleteTarget, setDeleteTarget] = useState<Badge | null>(null);

  function handleSubmit(input: { key?: string; name: string; description: string; icon: string }) {
    if (formTarget) {
      updateMutation.mutate(
        { id: formTarget.id, input: { name: input.name, description: input.description, icon: input.icon } },
        {
          onSuccess: () => {
            toast.success('Badge updated.');
            setFormTarget(undefined);
          },
          onError: () => toast.error('Could not update this badge.'),
        },
      );
      return;
    }
    createMutation.mutate(
      { key: input.key ?? '', name: input.name, description: input.description, icon: input.icon },
      {
        onSuccess: () => {
          toast.success('Badge created.');
          setFormTarget(undefined);
        },
        onError: () => toast.error('Could not create this badge — the key may already be in use.'),
      },
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Badges</h1>
          <p className="mt-1 text-muted-foreground">Manage the badge catalog and preview how badges render.</p>
        </div>
        <Button onClick={() => setFormTarget(null)}>
          <Plus className="size-4" aria-hidden="true" />
          New badge
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <EmptyState title="Couldn't load badges" action={<Button onClick={() => void refetch()}>Retry</Button>} />
        ) : !badges || badges.length === 0 ? (
          <EmptyState title="No badges yet" description="Create the first badge to get started." />
        ) : (
          <div className="space-y-4">
            <BadgeGrid badges={badges} />
            <div className="divide-y divide-border rounded-lg border border-border">
              {badges.map((badge) => (
                <div key={badge.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{badge.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {badge.key} — {badge.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setFormTarget(badge)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(badge)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BadgeFormDialog
        badge={formTarget ?? null}
        open={formTarget !== undefined}
        onOpenChange={(open) => {
          if (!open) setFormTarget(undefined);
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        description="Any users who hold this badge will lose it. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('Badge deleted.');
              setDeleteTarget(null);
            },
            onError: () => toast.error('Could not delete this badge.'),
          });
        }}
      />
    </PageContainer>
  );
}
