import { prisma } from '../config/database';
import { writeAuditLog } from '../utils/auditLog';
import type { StatCardSlot } from '../generated/prisma/client';
import { StorageService, type UploadedFile } from './storage.service';

const IMAGE_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

interface ResolvedStatCardImage {
  slot: StatCardSlot;
  url: string | null;
}

// getPublicUrl() returns null until R2_PUBLIC_URL is configured on the
// bucket — falls back to a long-lived signed URL (7 days), same fallback
// convention as the Site Font Engine's file resolution.
async function resolveImageUrl(key: string): Promise<string | null> {
  return StorageService.getPublicUrl(key) ?? (await StorageService.getSignedDownloadUrl(key, IMAGE_URL_EXPIRY_SECONDS));
}

export class StatCardImagesService {
  // Public — the homepage fetches this on every load, so it stays fast and
  // unauthenticated.
  static async getAll(): Promise<ResolvedStatCardImage[]> {
    const images = await prisma.statCardImage.findMany();
    return Promise.all(
      images.map(async (image) => ({
        slot: image.slot,
        url: await resolveImageUrl(image.imageKey),
      })),
    );
  }

  static async upsertImage(slot: StatCardSlot, actorId: string, file: UploadedFile): Promise<ResolvedStatCardImage[]> {
    const existing = await prisma.statCardImage.findUnique({ where: { slot } });
    const { key } = await StorageService.uploadStatCardImage(slot, existing?.imageKey, file);

    const image = await prisma.statCardImage.upsert({
      where: { slot },
      update: { imageKey: key, updatedById: actorId },
      create: { slot, imageKey: key, updatedById: actorId },
    });

    await writeAuditLog({
      actorId,
      action: 'stat_card_image.update',
      targetType: 'stat_card_image',
      targetId: image.id,
      newValue: { slot },
    });

    return StatCardImagesService.getAll();
  }

  static async resetImage(slot: StatCardSlot, actorId: string): Promise<void> {
    const existing = await prisma.statCardImage.findUnique({ where: { slot } });
    if (!existing) return;

    await StorageService.deleteObject(existing.imageKey);
    await prisma.statCardImage.delete({ where: { slot } });

    await writeAuditLog({
      actorId,
      action: 'stat_card_image.reset',
      targetType: 'stat_card_image',
      targetId: existing.id,
      oldValue: { slot },
    });
  }
}
