'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBadgeAdmin,
  deleteBadgeAdmin,
  grantBadgeAdmin,
  listBadgeCatalogAdmin,
  listUserBadges,
  revokeBadgeAdmin,
  updateBadgeAdmin,
} from '@/lib/api/badges';
import type { CreateBadgeInput, UpdateBadgeInput } from '@/types/badge';

export function useUserBadges(username: string) {
  return useQuery({
    queryKey: ['users', 'badges', username],
    queryFn: () => listUserBadges(username),
    enabled: Boolean(username),
  });
}

const ADMIN_BADGES_KEY = ['admin', 'badges'];

export function useAdminBadgeCatalog() {
  return useQuery({
    queryKey: ADMIN_BADGES_KEY,
    queryFn: listBadgeCatalogAdmin,
  });
}

function useInvalidateAdminBadges() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ADMIN_BADGES_KEY });
}

export function useCreateBadge() {
  const invalidate = useInvalidateAdminBadges();
  return useMutation({
    mutationFn: (input: CreateBadgeInput) => createBadgeAdmin(input),
    onSuccess: invalidate,
  });
}

export function useUpdateBadge() {
  const invalidate = useInvalidateAdminBadges();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateBadgeInput }) => updateBadgeAdmin(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteBadge() {
  const invalidate = useInvalidateAdminBadges();
  return useMutation({
    mutationFn: (id: number) => deleteBadgeAdmin(id),
    onSuccess: invalidate,
  });
}

export function useGrantBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, badgeId }: { userId: string; badgeId: number }) => grantBadgeAdmin(userId, badgeId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users', 'badges'] }),
  });
}

export function useRevokeBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, badgeId }: { userId: string; badgeId: number }) => revokeBadgeAdmin(userId, badgeId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users', 'badges'] }),
  });
}
