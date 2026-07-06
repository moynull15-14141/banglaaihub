'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getCategoryBySlug,
  listCategories,
  listCategoryResources,
} from '@/lib/api/categories';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
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
