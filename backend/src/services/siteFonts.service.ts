import { prisma } from '../config/database';
import { buildGoogleFontCssUrl, findGoogleFont, GOOGLE_FONTS_CATALOG } from '../config/googleFontsCatalog';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import type { FontSlot, FontStyle } from '../generated/prisma/client';
import { StorageService, type UploadedFile } from './storage.service';

const FAMILY_NAME_PATTERN = /^[a-zA-Z0-9 _-]{1,60}$/;
const FONT_FILE_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

interface ResolvedFontFile {
  weight: number;
  style: FontStyle;
  format: string;
  url: string | null;
}

interface ResolvedSiteFont {
  slot: FontSlot;
  source: 'google' | 'custom';
  family: string;
  fallback: string;
  css_url: string | null;
  files: ResolvedFontFile[];
}

type UpsertFontInput =
  | { source: 'google'; family: string }
  | { source: 'custom'; family: string; fallback?: string };

// getPublicUrl() returns null until R2_PUBLIC_URL is configured on the
// bucket — falls back to a long-lived signed URL (7 days) so a custom font
// still works either way, same fallback convention as every other
// R2-backed URL in this codebase.
async function resolveFontFileUrl(key: string): Promise<string | null> {
  return StorageService.getPublicUrl(key) ?? (await StorageService.getSignedDownloadUrl(key, FONT_FILE_URL_EXPIRY_SECONDS));
}

export class SiteFontService {
  static getCatalog() {
    return GOOGLE_FONTS_CATALOG;
  }

  // Public — consumed by the frontend's root layout on every request (with
  // its own cache/revalidate policy), so this stays fast and unauthenticated.
  static async getActiveFonts(): Promise<ResolvedSiteFont[]> {
    const fonts = await prisma.siteFont.findMany({ include: { files: true } });

    return Promise.all(
      fonts.map(async (font): Promise<ResolvedSiteFont> => {
        if (font.source === 'google') {
          const entry = findGoogleFont(font.family);
          return {
            slot: font.slot,
            source: font.source,
            family: font.family,
            fallback: font.fallback,
            css_url: entry ? buildGoogleFontCssUrl(entry, entry.weights) : null,
            files: [],
          };
        }

        const files = await Promise.all(
          font.files.map(async (file): Promise<ResolvedFontFile> => ({
            weight: file.weight,
            style: file.style,
            format: file.format,
            url: await resolveFontFileUrl(file.fileKey),
          })),
        );

        return {
          slot: font.slot,
          source: font.source,
          family: font.family,
          fallback: font.fallback,
          css_url: null,
          files,
        };
      }),
    );
  }

  static async upsertFont(slot: FontSlot, actorId: string, input: UpsertFontInput): Promise<ResolvedSiteFont[]> {
    if (input.source === 'google') {
      if (!findGoogleFont(input.family)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Unknown font family — pick one from the catalog.');
      }
    } else if (!FAMILY_NAME_PATTERN.test(input.family)) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Font name may only contain letters, numbers, spaces, underscores, and hyphens.',
      );
    }

    const existing = await prisma.siteFont.findUnique({ where: { slot }, include: { files: true } });

    const font = await prisma.siteFont.upsert({
      where: { slot },
      update: {
        source: input.source,
        family: input.family,
        fallback: input.source === 'custom' && input.fallback ? input.fallback : undefined,
        updatedById: actorId,
      },
      create: {
        slot,
        source: input.source,
        family: input.family,
        fallback: input.source === 'custom' && input.fallback ? input.fallback : undefined,
        updatedById: actorId,
      },
    });

    // Re-picking away from a previously-uploaded custom font (or switching
    // to google) orphans its files — clean them up rather than accumulating
    // dead R2 objects nobody will ever reference again.
    if (existing && existing.source === 'custom' && (input.source === 'google' || existing.family !== input.family)) {
      await SiteFontService.deleteFontFiles(
        existing.files.map((file) => file.fileKey),
      );
      await prisma.siteFontFile.deleteMany({ where: { fontId: font.id } });
    }

    await writeAuditLog({
      actorId,
      action: 'site_font.update',
      targetType: 'site_font',
      targetId: font.id,
      oldValue: existing ? { source: existing.source, family: existing.family } : undefined,
      newValue: { slot, source: input.source, family: input.family },
    });

    return SiteFontService.getActiveFonts();
  }

  static async attachFontFile(
    slot: FontSlot,
    actorId: string,
    weight: number,
    style: FontStyle,
    file: UploadedFile,
  ): Promise<ResolvedSiteFont[]> {
    const font = await prisma.siteFont.findUnique({ where: { slot } });
    if (!font || font.source !== 'custom') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Set this slot to a custom font before uploading a file.');
    }

    const { key } = await StorageService.uploadFontFile(font.id, file);
    const format = key.split('.').pop() ?? 'woff2';

    const existingFile = await prisma.siteFontFile.findUnique({
      where: { fontId_weight_style: { fontId: font.id, weight, style } },
    });
    if (existingFile) {
      await StorageService.deleteObject(existingFile.fileKey);
    }

    await prisma.siteFontFile.upsert({
      where: { fontId_weight_style: { fontId: font.id, weight, style } },
      update: { fileKey: key, format },
      create: { fontId: font.id, weight, style, fileKey: key, format },
    });

    await writeAuditLog({
      actorId,
      action: 'site_font.upload_file',
      targetType: 'site_font',
      targetId: font.id,
      newValue: { weight, style, format },
    });

    return SiteFontService.getActiveFonts();
  }

  static async resetFont(slot: FontSlot, actorId: string): Promise<void> {
    const font = await prisma.siteFont.findUnique({ where: { slot }, include: { files: true } });
    if (!font) return;

    await SiteFontService.deleteFontFiles(font.files.map((file) => file.fileKey));
    await prisma.siteFont.delete({ where: { id: font.id } });

    await writeAuditLog({
      actorId,
      action: 'site_font.reset',
      targetType: 'site_font',
      targetId: font.id,
      oldValue: { slot, source: font.source, family: font.family },
    });
  }

  // Best-effort — DB rows are the source of truth; a file that fails to
  // delete here is a storage-cost issue, not a correctness one (same
  // tradeoff StorageService.replaceObject() already documents).
  private static async deleteFontFiles(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => StorageService.deleteObject(key)));
  }
}
