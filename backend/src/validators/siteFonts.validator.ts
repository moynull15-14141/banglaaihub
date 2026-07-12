import { z } from 'zod';

export const FONT_SLOTS = ['sans', 'heading', 'mono'] as const;
export const FONT_STYLES = ['normal', 'italic'] as const;

export const fontSlotParamSchema = z.object({
  slot: z.enum(FONT_SLOTS),
});
export type FontSlotParam = z.infer<typeof fontSlotParamSchema>;

// `family` for source: 'google' must match a googleFontsCatalog.ts entry —
// checked in SiteFontService.upsertFont(), not here (the catalog is backend
// config, not something the request-shape validator should hardcode). For
// source: 'custom' it's sanitized in the service too (letters/digits/space/
// hyphen only) since it's admin-chosen freeform text.
export const upsertFontSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('google'),
    family: z.string().min(1).max(100),
  }),
  z.object({
    source: z.literal('custom'),
    family: z.string().min(1).max(60),
    fallback: z.string().min(1).max(200).optional(),
  }),
]);
export type UpsertFontInput = z.infer<typeof upsertFontSchema>;

export const uploadFontFileQuerySchema = z.object({
  weight: z.coerce.number().int().min(100).max(900),
  style: z.enum(FONT_STYLES).optional().default('normal'),
});
export type UploadFontFileQuery = z.infer<typeof uploadFontFileQuerySchema>;
