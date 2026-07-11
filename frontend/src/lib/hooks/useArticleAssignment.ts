'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignArticle,
  listAssignedToMe,
  listAssignments,
  unassignArticle,
  type AssignmentRole,
} from '@/lib/api/articleWorkflow';

export function useArticleAssignments(slug: string) {
  return useQuery({
    queryKey: ['articles', 'assignments', slug],
    queryFn: () => listAssignments(slug),
    enabled: Boolean(slug),
  });
}

export function useAssignArticle(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { role: AssignmentRole; assigned_to_id: string; due_date?: string }) =>
      assignArticle(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['articles', 'assignments', slug] });
    },
  });
}

export function useUnassignArticle(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: AssignmentRole) => unassignArticle(slug, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['articles', 'assignments', slug] });
    },
  });
}

export function useAssignedToMe() {
  return useQuery({
    queryKey: ['articles', 'assigned-to-me'],
    queryFn: listAssignedToMe,
  });
}
