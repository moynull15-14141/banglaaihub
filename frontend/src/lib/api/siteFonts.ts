import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';

export type FontSlot = 'sans' | 'heading' | 'mono';
export type FontSource = 'google' | 'custom';
export type FontStyle = 'normal' | 'italic';

export interface GoogleFontCatalogEntry {
  family: string;
  weights: number[];
  supportsBengali: boolean;
}

export interface SiteFontFile {
  weight: number;
  style: FontStyle;
  format: string;
  url: string | null;
}

export interface SiteFont {
  slot: FontSlot;
  source: FontSource;
  family: string;
  fallback: string;
  css_url: string | null;
  files: SiteFontFile[];
}

export async function getActiveFonts(): Promise<SiteFont[]> {
  const response = await apiClient.get<ApiSuccessResponse<SiteFont[]>>('/site-settings/fonts');
  return response.data.data;
}

export async function getFontCatalog(): Promise<GoogleFontCatalogEntry[]> {
  const response = await apiClient.get<ApiSuccessResponse<GoogleFontCatalogEntry[]>>('/site-settings/fonts/catalog');
  return response.data.data;
}

export async function upsertFont(
  slot: FontSlot,
  input: { source: 'google'; family: string } | { source: 'custom'; family: string; fallback?: string },
): Promise<SiteFont[]> {
  const response = await apiClient.put<ApiSuccessResponse<SiteFont[]>>(
    `/site-settings/fonts/${slot}`,
    input,
  );
  return response.data.data;
}

export async function uploadFontFile(
  slot: FontSlot,
  weight: number,
  style: FontStyle,
  file: File,
): Promise<SiteFont[]> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<ApiSuccessResponse<SiteFont[]>>(
    `/site-settings/fonts/${slot}/upload`,
    formData,
    { params: { weight, style }, headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data.data;
}

export async function resetFont(slot: FontSlot): Promise<void> {
  await apiClient.delete(`/site-settings/fonts/${slot}`);
}
