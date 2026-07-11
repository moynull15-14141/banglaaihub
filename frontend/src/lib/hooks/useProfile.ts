'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMe,
  removeCoverImage,
  updateNotificationPreference,
  updateProfile,
  uploadAvatar,
  uploadCoverImage,
} from '@/lib/api/users';
import { useAuthStore } from '@/lib/store/authStore';
import type { OwnProfile } from '@/types/user';

const OWN_PROFILE_KEY = ['users', 'me', 'profile'];

export function useOwnProfile() {
  return useQuery({
    queryKey: OWN_PROFILE_KEY,
    queryFn: getMe,
  });
}

// Both mutations below sync authStore.user on success (not just the React
// Query cache) — the navbar/sidebar avatar and display name read from the
// Zustand store, not from this query, so they'd otherwise go stale until
// the next full session refresh.
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      setUser(profile);
      queryClient.setQueryData(OWN_PROFILE_KEY, profile);
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: ({ avatar_url }) => {
      if (user) setUser({ ...user, avatar_url });
      void queryClient.invalidateQueries({ queryKey: OWN_PROFILE_KEY });
    },
  });
}

export function useUploadCoverImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadCoverImage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OWN_PROFILE_KEY });
    },
  });
}

export function useRemoveCoverImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeCoverImage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OWN_PROFILE_KEY });
    },
  });
}

// Optimistic toggle — a Switch must flip the instant it's clicked, not
// after a round trip. Rolls back to the pre-toggle snapshot on error so a
// failed request doesn't leave the switch showing a state the server never
// actually saved.
export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ category, enabled }: { category: string; enabled: boolean }) =>
      updateNotificationPreference(category, enabled),
    onMutate: async ({ category, enabled }) => {
      await queryClient.cancelQueries({ queryKey: OWN_PROFILE_KEY });
      const previous = queryClient.getQueryData<OwnProfile>(OWN_PROFILE_KEY);
      if (previous) {
        queryClient.setQueryData<OwnProfile>(OWN_PROFILE_KEY, {
          ...previous,
          muted_notification_categories: enabled
            ? previous.muted_notification_categories.filter((key) => key !== category)
            : [...previous.muted_notification_categories, category],
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(OWN_PROFILE_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: OWN_PROFILE_KEY });
    },
  });
}
