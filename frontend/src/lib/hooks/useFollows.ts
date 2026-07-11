'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { followUser, listFollowers, listFollowing, unfollowUser } from '@/lib/api/follows';
import type { ListFollowParams } from '@/types/follow';

export function useFollowers(username: string, params: ListFollowParams = {}) {
  return useQuery({
    queryKey: ['users', 'followers', username, params],
    queryFn: () => listFollowers(username, params),
    enabled: Boolean(username),
  });
}

export function useFollowing(username: string, params: ListFollowParams = {}) {
  return useQuery({
    queryKey: ['users', 'following', username, params],
    queryFn: () => listFollowing(username, params),
    enabled: Boolean(username),
  });
}

// One mutation, `follow` flag per call — same shape as useToggleResourceBookmark.
export function useToggleFollow(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ follow }: { follow: boolean }) => (follow ? followUser(username) : unfollowUser(username)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'profile', username] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'followers', username] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'following', username] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'profile'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'dashboard'] });
    },
  });
}
