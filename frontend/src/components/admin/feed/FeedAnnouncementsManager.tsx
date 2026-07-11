'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import { FeedAnnouncementFormDialog } from '@/components/admin/feed/FeedAnnouncementFormDialog';
import {
  useCreateFeedAnnouncement,
  useDeleteFeedAnnouncement,
  useFeedAnnouncements,
  useUpdateFeedAnnouncement,
} from '@/lib/hooks/useFeedAdmin';
import type { FeedAnnouncement } from '@/types/feed-admin';

export function FeedAnnouncementsManager() {
  const { data: announcements, isLoading, isError, refetch } = useFeedAnnouncements();
  const createMutation = useCreateFeedAnnouncement();
  const updateMutation = useUpdateFeedAnnouncement();
  const deleteMutation = useDeleteFeedAnnouncement();

  const [formTarget, setFormTarget] = useState<FeedAnnouncement | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<FeedAnnouncement | null>(null);

  function handleSubmit(input: { title: string; body: string; link_url?: string; is_active: boolean }) {
    if (formTarget) {
      updateMutation.mutate(
        { id: formTarget.id, input },
        {
          onSuccess: () => {
            toast.success('Announcement updated.');
            setFormTarget(undefined);
          },
          onError: () => toast.error('Could not update this announcement.'),
        },
      );
      return;
    }
    createMutation.mutate(input, {
      // Stay open, switched into edit mode for the newly created row —
      // the image field only becomes available once an id exists (see
      // FeedAnnouncementFormDialog), so closing here would mean going
      // through Edit separately just to add an image.
      onSuccess: (created) => {
        toast.success('Announcement created — add an image below, or close when done.');
        setFormTarget(created);
      },
      onError: () => toast.error('Could not create this announcement.'),
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Announcements</h2>
          <p className="text-sm text-muted-foreground">Platform-wide messages surfaced as feed cards.</p>
        </div>
        <Button onClick={() => setFormTarget(null)}>
          <Plus className="size-4" aria-hidden="true" />
          New
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <EmptyState
            title="Couldn't load announcements"
            action={<Button onClick={() => void refetch()}>Retry</Button>}
          />
        ) : !announcements || announcements.length === 0 ? (
          <EmptyState title="No announcements yet" description="Create one to message everyone via the feed." />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {announcement.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small admin-list thumbnail preview
                    <img
                      src={announcement.image_url}
                      alt=""
                      className="size-10 shrink-0 rounded-md border border-border/60 object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={announcement.is_active ? 'success' : 'secondary'}>
                        {announcement.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <p className="truncate text-sm font-medium">{announcement.title}</p>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{announcement.body}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => setFormTarget(announcement)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(announcement)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <FeedAnnouncementFormDialog
        announcement={formTarget ?? null}
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
        title={`Delete "${deleteTarget?.title ?? ''}"?`}
        description="This announcement will stop appearing in the feed immediately. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('Announcement deleted.');
              setDeleteTarget(null);
            },
            onError: () => toast.error('Could not delete this announcement.'),
          });
        }}
      />
    </Card>
  );
}
