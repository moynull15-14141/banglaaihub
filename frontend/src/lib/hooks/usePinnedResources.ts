'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMyPinnedResources,
  listPinnedResources,
  pinResource,
  reorderPinnedResources,
  unpinResource,
} from '@/lib/api/pinned-resources';

export function usePinnedResources(username: string) {
  return useQuery({
    queryKey: ['users', 'pinned-resources', username],
    queryFn: () => listPinnedResources(username),
    enabled: Boolean(username),
  });
}

export function useMyPinnedResources() {
  return useQuery({
    queryKey: ['users', 'me', 'pinned-resources'],
    queryFn: listMyPinnedResources,
  });
}

function useInvalidatePinnedResources(username?: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'pinned-resources'] });
    if (username) void queryClient.invalidateQueries({ queryKey: ['users', 'pinned-resources', username] });
    void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'dashboard'] });
  };
}

export function usePinResource(username?: string) {
  const invalidate = useInvalidatePinnedResources(username);
  return useMutation({
    mutationFn: (resourceId: string) => pinResource(resourceId),
    onSuccess: invalidate,
  });
}

export function useUnpinResource(username?: string) {
  const invalidate = useInvalidatePinnedResources(username);
  return useMutation({
    mutationFn: (resourceId: string) => unpinResource(resourceId),
    onSuccess: invalidate,
  });
}

export function useReorderPinnedResources(username?: string) {
  const invalidate = useInvalidatePinnedResources(username);
  return useMutation({
    mutationFn: (resourceIds: string[]) => reorderPinnedResources(resourceIds),
    onSuccess: invalidate,
  });
}
