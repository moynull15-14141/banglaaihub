import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/authStore';
import {
  getActiveFonts,
  getFontCatalog,
  resetFont,
  uploadFontFile,
  upsertFont,
  type FontSlot,
  type FontStyle,
} from '@/lib/api/siteFonts';

const SITE_FONTS_KEY = ['site-fonts'];
const FONT_CATALOG_KEY = ['site-fonts', 'catalog'];

export function useSiteFonts() {
  return useQuery({ queryKey: SITE_FONTS_KEY, queryFn: getActiveFonts });
}

export function useFontCatalog() {
  return useQuery({ queryKey: FONT_CATALOG_KEY, queryFn: getFontCatalog });
}

// Bumps the frontend's cached font settings so the admin page's own list
// reflects the save immediately, then tells the Next.js layout's server-side
// fetch to drop its 1-hour cache too — otherwise the admin would see their
// change here but the public site would keep showing the old font for up to
// an hour.
async function revalidatePublicFonts(): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;
  await fetch('/api/revalidate-fonts', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => {
    // Best-effort — the 1-hour TTL is the correctness backstop either way.
  });
}

export function useUpsertFont() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slot,
      input,
    }: {
      slot: FontSlot;
      input: { source: 'google'; family: string } | { source: 'custom'; family: string; fallback?: string };
    }) => upsertFont(slot, input),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: SITE_FONTS_KEY });
      await revalidatePublicFonts();
    },
  });
}

export function useUploadFontFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slot,
      weight,
      style,
      file,
    }: {
      slot: FontSlot;
      weight: number;
      style: FontStyle;
      file: File;
    }) => uploadFontFile(slot, weight, style, file),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: SITE_FONTS_KEY });
      await revalidatePublicFonts();
    },
  });
}

export function useResetFont() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slot: FontSlot) => resetFont(slot),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: SITE_FONTS_KEY });
      await revalidatePublicFonts();
    },
  });
}
