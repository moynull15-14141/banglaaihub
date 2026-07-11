import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { resourceInclude, toResourceDto } from './resources.service';

const MAX_PINNED_RESOURCES = 6;

export class PinnedResourceService {
  // Public view (profile page, by username) — only ever shows resources a
  // visitor could otherwise see, so pending/rejected pins are filtered out
  // even though pin() itself doesn't block pinning them (see below).
  static async list(username: string): Promise<unknown[]> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    return this.listForUserId(user.id, { approvedOnly: true });
  }

  // Own dashboard editor (PinnedResourcesEditor) — the owner needs to see
  // and manage every resource they've pinned, including one still pending
  // review, or it'd silently vanish from their own editor despite still
  // being pinned in the DB.
  static async listOwn(userId: string): Promise<unknown[]> {
    return this.listForUserId(userId, { approvedOnly: false });
  }

  private static async listForUserId(
    userId: string,
    { approvedOnly }: { approvedOnly: boolean },
  ): Promise<unknown[]> {
    const pins = await prisma.pinnedResource.findMany({
      where: {
        userId,
        resource: approvedOnly ? { status: 'approved', deletedAt: null } : { deletedAt: null },
      },
      orderBy: { position: 'asc' },
      include: { resource: { include: resourceInclude } },
    });

    return Promise.all(pins.map((pin) => toResourceDto(pin.resource)));
  }

  static async pin(userId: string, resourceId: string): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
    if (resource.authorId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You can only pin your own resources.');
    }

    const existing = await prisma.pinnedResource.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'This resource is already pinned.');
    }

    const count = await prisma.pinnedResource.count({ where: { userId } });
    if (count >= MAX_PINNED_RESOURCES) {
      throw new ApiError(400, 'VALIDATION_ERROR', `You can pin at most ${MAX_PINNED_RESOURCES} resources.`);
    }

    await prisma.pinnedResource.create({ data: { userId, resourceId, position: count } });
  }

  static async unpin(userId: string, resourceId: string): Promise<void> {
    const existing = await prisma.pinnedResource.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'This resource is not pinned.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.pinnedResource.delete({ where: { id: existing.id } });
      // Close the gap so positions stay contiguous 0..n-1.
      await tx.pinnedResource.updateMany({
        where: { userId, position: { gt: existing.position } },
        data: { position: { decrement: 1 } },
      });
    });
  }

  static async reorder(userId: string, orderedResourceIds: string[]): Promise<void> {
    const pins = await prisma.pinnedResource.findMany({ where: { userId } });
    const pinnedIds = new Set(pins.map((pin) => pin.resourceId));

    if (orderedResourceIds.length !== pins.length || !orderedResourceIds.every((id) => pinnedIds.has(id))) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'The provided resource list does not match your pinned resources.');
    }

    await prisma.$transaction(
      orderedResourceIds.map((resourceId, index) =>
        prisma.pinnedResource.update({
          where: { userId_resourceId: { userId, resourceId } },
          data: { position: index },
        }),
      ),
    );
  }
}
