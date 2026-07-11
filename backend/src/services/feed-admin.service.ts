import { prisma } from '../config/database';
import { StorageService, type UploadedFile } from './storage.service';
import { ApiError } from '../utils/ApiError';
import type {
  CreateFeedAnnouncementInput,
  CreateFeedPinInput,
  FeedPreviewPersona,
  UpdateFeedAnnouncementInput,
  UpdateFeedPinInput,
} from '../validators/feed.validator';

// A stored value is either a bare R2 key (something *uploaded*) or a pasted
// http(s):// link (ThumbnailUrlInput's URL mode) — only the former is ever
// safe to hand to StorageService.deleteObject/replaceObject. Same guard as
// resources.service.ts's objectKeyOrNull.
function objectKeyOrNull(value: string | null): string | null {
  if (!value || /^https?:\/\//i.test(value)) return null;
  return value;
}

const pinResourceSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  thumbnailUrl: true,
} as const;

function toFeedPinDto(pin: {
  id: string;
  resourceId: string;
  pinType: string;
  position: number;
  pinnedBy: string;
  note: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  resource: { id: string; slug: string; title: string; type: string; thumbnailUrl: string | null };
}): Record<string, unknown> {
  return {
    id: pin.id,
    pin_type: pin.pinType,
    position: pin.position,
    pinned_by: pin.pinnedBy,
    note: pin.note,
    starts_at: pin.startsAt,
    ends_at: pin.endsAt,
    created_at: pin.createdAt,
    resource: {
      id: pin.resource.id,
      slug: pin.resource.slug,
      title: pin.resource.title,
      type: pin.resource.type,
      thumbnail_url: pin.resource.thumbnailUrl,
    },
  };
}

async function toFeedAnnouncementDto(a: {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  createdBy: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Promise<Record<string, unknown>> {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    image_url: await StorageService.resolveUrl(a.imageUrl),
    link_url: a.linkUrl,
    created_by: a.createdBy,
    is_active: a.isActive,
    starts_at: a.startsAt,
    ends_at: a.endsAt,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

export class FeedAdminService {
  // --- Pins (Featured / Editor's Pick placement) -----------------------------------

  static async listPins(): Promise<unknown[]> {
    const pins = await prisma.feedPin.findMany({
      include: { resource: { select: pinResourceSelect } },
      orderBy: [{ pinType: 'asc' }, { position: 'asc' }],
    });
    return pins.map(toFeedPinDto);
  }

  static async createPin(input: CreateFeedPinInput, pinnedBy: string): Promise<unknown> {
    const resource = await prisma.resource.findUnique({ where: { id: input.resource_id } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const existing = await prisma.feedPin.findUnique({
      where: { resourceId_pinType: { resourceId: input.resource_id, pinType: input.pin_type } },
    });
    if (existing) {
      throw new ApiError(409, 'ALREADY_PINNED', 'This resource already has a pin of this type.');
    }

    const pin = await prisma.feedPin.create({
      data: {
        resourceId: input.resource_id,
        pinType: input.pin_type,
        position: input.position ?? 0,
        pinnedBy,
        note: input.note ?? null,
        startsAt: input.starts_at ? new Date(input.starts_at) : null,
        endsAt: input.ends_at ? new Date(input.ends_at) : null,
      },
      include: { resource: { select: pinResourceSelect } },
    });
    return toFeedPinDto(pin);
  }

  static async updatePin(id: string, input: UpdateFeedPinInput): Promise<unknown> {
    const existing = await prisma.feedPin.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Pin not found.');
    }

    const pin = await prisma.feedPin.update({
      where: { id },
      data: {
        position: input.position ?? undefined,
        note: input.note === undefined ? undefined : input.note,
        startsAt: input.starts_at === undefined ? undefined : input.starts_at ? new Date(input.starts_at) : null,
        endsAt: input.ends_at === undefined ? undefined : input.ends_at ? new Date(input.ends_at) : null,
      },
      include: { resource: { select: pinResourceSelect } },
    });
    return toFeedPinDto(pin);
  }

  static async deletePin(id: string): Promise<void> {
    const existing = await prisma.feedPin.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Pin not found.');
    }
    await prisma.feedPin.delete({ where: { id } });
  }

  // --- Announcements -----------------------------------------------------------------

  static async listAnnouncements(): Promise<unknown[]> {
    const announcements = await prisma.feedAnnouncement.findMany({ orderBy: { createdAt: 'desc' } });
    return Promise.all(announcements.map(toFeedAnnouncementDto));
  }

  static async createAnnouncement(input: CreateFeedAnnouncementInput, createdBy: string): Promise<unknown> {
    const announcement = await prisma.feedAnnouncement.create({
      data: {
        title: input.title,
        body: input.body,
        linkUrl: input.link_url ?? null,
        createdBy,
        isActive: input.is_active ?? true,
        startsAt: input.starts_at ? new Date(input.starts_at) : null,
        endsAt: input.ends_at ? new Date(input.ends_at) : null,
      },
    });
    return toFeedAnnouncementDto(announcement);
  }

  static async updateAnnouncement(id: string, input: UpdateFeedAnnouncementInput): Promise<unknown> {
    const existing = await prisma.feedAnnouncement.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Announcement not found.');
    }

    const announcement = await prisma.feedAnnouncement.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        body: input.body ?? undefined,
        linkUrl: input.link_url === undefined ? undefined : input.link_url,
        isActive: input.is_active ?? undefined,
        startsAt: input.starts_at === undefined ? undefined : input.starts_at ? new Date(input.starts_at) : null,
        endsAt: input.ends_at === undefined ? undefined : input.ends_at ? new Date(input.ends_at) : null,
      },
    });
    return toFeedAnnouncementDto(announcement);
  }

  static async deleteAnnouncement(id: string): Promise<void> {
    const existing = await prisma.feedAnnouncement.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Announcement not found.');
    }
    await prisma.feedAnnouncement.delete({ where: { id } });
    const key = objectKeyOrNull(existing.imageUrl);
    if (key) {
      await StorageService.deleteObject(key).catch(() => {
        // Best-effort cleanup only, same as every other delete flow — an
        // orphaned object is a storage-cost issue, not a correctness one.
      });
    }
  }

  static async uploadAnnouncementImage(id: string, file: UploadedFile): Promise<unknown> {
    const existing = await prisma.feedAnnouncement.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Announcement not found.');
    }

    const { key } = await StorageService.uploadFeedAnnouncementImage(id, objectKeyOrNull(existing.imageUrl), file);
    const announcement = await prisma.feedAnnouncement.update({ where: { id }, data: { imageUrl: key } });
    return toFeedAnnouncementDto(announcement);
  }

  static async removeAnnouncementImage(id: string): Promise<unknown> {
    const existing = await prisma.feedAnnouncement.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Announcement not found.');
    }

    const announcement = await prisma.feedAnnouncement.update({ where: { id }, data: { imageUrl: null } });
    const key = objectKeyOrNull(existing.imageUrl);
    if (key) {
      await StorageService.deleteObject(key).catch(() => {});
    }
    return toFeedAnnouncementDto(announcement);
  }

  // --- Live Preview (Phase 4C, Stage 1) -----------------------------------------------

  // Resolves each persona to a real existing user's real history (or null
  // for "anonymous") — the Live Preview must run the actual ranking engine
  // against actual affinity/follow/reputation data, never synthetic values.
  // Heuristics are intentionally simple, first-match; a platform with zero
  // qualifying users for a tier (e.g. no contributors yet) falls back to
  // "anonymous" rather than erroring, so preview always returns something.
  static async resolvePersonaUserId(persona: FeedPreviewPersona): Promise<string | null> {
    if (persona === 'anonymous') return null;

    if (persona === 'new_user') {
      const user = await prisma.user.findFirst({
        where: { deletedAt: null, status: 'active' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      return user?.id ?? null;
    }

    if (persona === 'admin') {
      const userRole = await prisma.userRole.findFirst({
        where: { role: { name: { in: ['admin', 'super_admin'] } }, user: { deletedAt: null, status: 'active' } },
        select: { userId: true },
      });
      return userRole?.userId ?? null;
    }

    if (persona === 'contributor') {
      const userRole = await prisma.userRole.findFirst({
        where: {
          role: { name: { in: ['contributor', 'verified_contributor'] } },
          user: { deletedAt: null, status: 'active' },
        },
        select: { userId: true },
      });
      return userRole?.userId ?? null;
    }

    if (persona === 'power_user') {
      const user = await prisma.user.findFirst({
        where: { deletedAt: null, status: 'active', reputationScore: { gt: 0 } },
        orderBy: { reputationScore: 'desc' },
        select: { id: true },
      });
      return user?.id ?? null;
    }

    // 'regular' — a plain `user`-tier account with at least some real
    // engagement history, so affinity/follow terms aren't trivially empty.
    const userRole = await prisma.userRole.findFirst({
      where: {
        role: { name: 'user' },
        user: { deletedAt: null, status: 'active', reputationScore: { gt: 0 } },
      },
      orderBy: { user: { reputationScore: 'asc' } },
      select: { userId: true },
    });
    return userRole?.userId ?? null;
  }
}
