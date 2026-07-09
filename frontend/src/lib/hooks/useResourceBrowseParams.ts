'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { ResourceLanguage, ResourceType } from '@/types/resource';

// Consolidates the URL-param read/write logic that used to be duplicated
// across ResourceListingView, SearchView, and CategoryView (Phase 3B).
// Query/type ownership stays with each caller — CategoryView passes
// `fixedCategory`, ResourceListingView passes `fixedType`, SearchView passes
// neither and reads/writes `q` itself alongside this hook.
// `sort` is a plain string (not ResourceSort) since it's shared by two
// different sort vocabularies — the Prisma-backed ResourceSort set and the
// MeiliSearch-backed SearchSort set (relevance/newest/popular only, no
// trending/updated/alpha) — callers narrow to whichever one they use.
export interface ResourceBrowseParamsOptions {
  defaultSort?: string;
  fixedType?: ResourceType;
  // SearchView already uses router.replace (so typing doesn't spam browser
  // history); every other browse view uses router.push. Defaults to push.
  navigate?: 'push' | 'replace';
}

export interface ResourceBrowseParams {
  page: number;
  sort: string;
  type: ResourceType | undefined;
  category: string | undefined;
  language: ResourceLanguage | undefined;
  license: string | undefined;
  author: string | undefined;
  verified: true | undefined;
  tags: string[] | undefined;
  updateParams: (updates: Record<string, string | undefined>) => void;
  clearFilters: () => void;
}

export function useResourceBrowseParams(
  options: ResourceBrowseParamsOptions = {},
): ResourceBrowseParams {
  const { defaultSort = 'newest', fixedType, navigate = 'push' } = options;
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const sort = searchParams.get('sort') ?? defaultSort;
  const category = searchParams.get('category') ?? undefined;
  const language = (searchParams.get('language') as ResourceLanguage | null) ?? undefined;
  const type = fixedType ?? ((searchParams.get('type') as ResourceType | null) ?? undefined);
  const license = searchParams.get('license') ?? undefined;
  const author = searchParams.get('author') ?? undefined;
  const verified = searchParams.get('verified') === 'true' ? true : undefined;
  const tagsParam = searchParams.get('tags');
  const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // Any filter/sort change restarts pagination from page 1.
      if (!('page' in updates)) {
        params.delete('page');
      }
      const target = `?${params.toString()}`;
      if (navigate === 'replace') {
        router.replace(target, { scroll: false });
      } else {
        router.push(target, { scroll: false });
      }
    },
    [router, searchParams, navigate],
  );

  const clearFilters = useCallback(() => {
    updateParams({
      type: fixedType,
      category: undefined,
      language: undefined,
      license: undefined,
      author: undefined,
      verified: undefined,
      tags: undefined,
      page: undefined,
    });
  }, [updateParams, fixedType]);

  return { page, sort, type, category, language, license, author, verified, tags, updateParams, clearFilters };
}
