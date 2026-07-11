import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';

export type SeoDuplicateField = 'title' | 'seo_description' | 'canonical_url';

export async function checkSeoDuplicate(
  field: SeoDuplicateField,
  value: string,
  excludeSlug?: string,
  signal?: AbortSignal,
): Promise<{ duplicate: boolean }> {
  const response = await apiClient.get<ApiSuccessResponse<{ duplicate: boolean }>>('/seo/duplicate-check', {
    params: { field, value, exclude_slug: excludeSlug },
    signal,
  });
  return response.data.data;
}

export interface SeoDashboardArticle {
  slug: string;
  title: string;
  status: string;
  score: number;
}

export interface SeoDashboard {
  article_count: number;
  average_score: number;
  missing_meta_description: number;
  missing_og_image: number;
  missing_canonical: number;
  missing_focus_keyword: number;
  low_word_count: number;
  duplicate_titles: { title: string; count: number }[];
  duplicate_descriptions: { description: string; count: number }[];
  articles: SeoDashboardArticle[];
}

export async function getSeoDashboard(): Promise<SeoDashboard> {
  const response = await apiClient.get<ApiSuccessResponse<SeoDashboard>>('/seo/dashboard');
  return response.data.data;
}
