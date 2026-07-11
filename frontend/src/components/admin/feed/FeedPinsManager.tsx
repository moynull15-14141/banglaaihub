'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/common/EmptyState';
import { getResourceBySlug } from '@/lib/api/resources';
import { useCreateFeedPin, useDeleteFeedPin, useFeedPins } from '@/lib/hooks/useFeedAdmin';
import type { FeedPinType } from '@/types/feed-admin';

const PIN_TYPE_LABELS: Record<FeedPinType, string> = {
  featured: 'Featured',
  editors_pick: "Editor's Pick",
};

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

export function FeedPinsManager() {
  const { data: pins, isLoading, isError, refetch } = useFeedPins();
  const createMutation = useCreateFeedPin();
  const deleteMutation = useDeleteFeedPin();

  const [slug, setSlug] = useState('');
  const [pinType, setPinType] = useState<FeedPinType>('featured');
  const [isResolving, setIsResolving] = useState(false);

  async function handleCreate() {
    const trimmedSlug = slug.trim();
    if (!trimmedSlug) return;
    setIsResolving(true);
    try {
      const resource = await getResourceBySlug(trimmedSlug);
      createMutation.mutate(
        { resource_id: resource.id, pin_type: pinType },
        {
          onSuccess: () => {
            toast.success(`Pinned "${resource.title}".`);
            setSlug('');
          },
          onError: (error) => toast.error(errorMessage(error, 'Could not pin this resource.')),
        },
      );
    } catch {
      toast.error(`No resource found with slug "${trimmedSlug}".`);
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold tracking-tight">Featured & Editor&apos;s Picks</h2>
        <p className="text-sm text-muted-foreground">
          Pin resources into the Community/For You feeds by slug — find the slug on the resource&apos;s page URL.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label htmlFor="pin-slug">Resource slug</Label>
            <Input
              id="pin-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="bangladesh-facts-dataset"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pin-type">Pin type</Label>
            <select
              id="pin-type"
              value={pinType}
              onChange={(event) => setPinType(event.target.value as FeedPinType)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {(Object.keys(PIN_TYPE_LABELS) as FeedPinType[]).map((type) => (
                <option key={type} value={type}>
                  {PIN_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => void handleCreate()}
            loading={isResolving || createMutation.isPending}
            disabled={!slug.trim()}
          >
            <Plus className="size-4" aria-hidden="true" />
            Pin
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <EmptyState title="Couldn't load pins" action={<Button onClick={() => void refetch()}>Retry</Button>} />
        ) : !pins || pins.length === 0 ? (
          <EmptyState title="No pins yet" description="Pin a resource above to feature it in the feed." />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {pins.map((pin) => (
              <div key={pin.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">{PIN_TYPE_LABELS[pin.pin_type]}</Badge>
                    <p className="truncate text-sm font-medium">{pin.resource.title}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">/{pin.resource.slug}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    deleteMutation.mutate(pin.id, {
                      onSuccess: () => toast.success('Pin removed.'),
                      onError: () => toast.error('Could not remove this pin.'),
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
