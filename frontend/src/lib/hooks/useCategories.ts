'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCategoryAdmin,
  deleteCategoryAdmin,
  getCategoryBySlug,
  listCategories,
  listCategoryResources,
  updateCategoryAdmin,
} from '@/lib/api/categories';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/types/category';

const CATEGORIES_KEY = ['categories'];

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: listCategories,
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ['categories', 'detail', slug],
    queryFn: () => getCategoryBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useCategoryResources(slug: string, params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['categories', 'resources', slug, params],
    queryFn: () => listCategoryResources(slug, params),
    enabled: Boolean(slug),
  });
}

// --- Admin taxonomy management ---------------------------------------------

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  // Broad invalidation (no `exact`) — a create/update/delete anywhere in the
  // tree can change parent/child listings and slugs across the whole
  // ['categories', ...] key family, not just the top-level list.
  return () => void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategoryAdmin(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateCategoryInput }) => updateCategoryAdmin(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: number) => deleteCategoryAdmin(id),
    onSuccess: invalidate,
  });
}
