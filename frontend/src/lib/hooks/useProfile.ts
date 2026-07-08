'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, updateProfile, uploadAvatar } from '@/lib/api/users';
import { useAuthStore } from '@/lib/store/authStore';

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
