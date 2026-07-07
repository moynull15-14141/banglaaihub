import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { writeAuditLog } from '../utils/auditLog';
import { getUserRoleNames } from './auth.service';
import { resourceInclude, toResourceDto } from './resources.service';
import { StorageService, type UploadedFile } from './storage.service';
import type { UpdateProfileInput } from '../validators/user.validator';
import type {
  ListUsersQuery,
  UpdateUserRolesInput,
  UpdateUserStatusInput,
} from '../validators/admin.validator';

const PUBLIC_PROFILE_RESOURCE_LIMIT = 10;

// Privilege-escalation guard for updateUserRoles: only a super_admin can
// grant admin/super_admin, or touch the roles of someone who already holds
// either — otherwise an admin could promote themselves (or anyone else) to
// super_admin, or silently demote an existing admin/super_admin.
const TOP_TIER_ROLES = ['admin', 'super_admin'];
const includesTopTierRole = (roleNames: string[]): boolean =>
  roleNames.some((name) => TOP_TIER_ROLES.includes(name));

// Maps the four author-facing filter words back onto doc 10's actual
// ResourceStatus enum (pending | approved | rejected | flagged) — "draft" has
// no distinct DB status of its own, so it's treated as a synonym for
// "pending" (not yet reviewed), and "published" maps to "approved".
const SUBMISSION_STATUS_MAP: Record<string, 'pending' | 'approved' | 'rejected'> = {
  draft: 'pending',
  pending: 'pending',
  published: 'approved',
  rejected: 'rejected',
};

async function resolveAvatarUrl(key: string | null): Promise<string | null> {
  if (!key) return null;
  return StorageService.getSignedAvatarUrl(key);
}

// Admin-facing user shape — an explicit allowlist, same discipline as the
// public/own-profile DTOs above. Never includes password_hash, google_id,
// github_id, or anything about refresh tokens/password history.
function toAdminUserDto(
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    bio: string | null;
    institution: string | null;
    location: string | null;
    websiteUrl: string | null;
    githubUrl: string | null;
    scholarUrl: string | null;
    kaggleUrl: string | null;
    huggingfaceUrl: string | null;
    linkedinUrl: string | null;
    orcidId: string | null;
    xUrl: string | null;
    reputationScore: number;
    isVerified: boolean;
    emailVerified: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    deletedAt: Date | null;
  },
  roles: string[],
  avatarUrl: string | null,
): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.displayName,
    avatar_url: avatarUrl,
    bio: user.bio,
    institution: user.institution,
    location: user.location,
    website_url: user.websiteUrl,
    github_url: user.githubUrl,
    scholar_url: user.scholarUrl,
    kaggle_url: user.kaggleUrl,
    huggingface_url: user.huggingfaceUrl,
    linkedin_url: user.linkedinUrl,
    orcid_id: user.orcidId,
    x_url: user.xUrl,
    reputation_score: user.reputationScore,
    is_verified: user.isVerified,
    email_verified: user.emailVerified,
    status: user.status,
    roles,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    last_login_at: user.lastLoginAt,
    deleted_at: user.deletedAt,
  };
}

export class UserService {
  static async getPublicProfile(username: string): Promise<Record<string, unknown>> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        authoredResources: {
          where: { status: 'approved', deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: PUBLIC_PROFILE_RESOURCE_LIMIT,
          include: resourceInclude,
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    const stats = await prisma.resource.aggregate({
      where: { authorId: user.id, status: 'approved', deletedAt: null },
      _count: { _all: true },
      _sum: { downloadCount: true, viewCount: true },
    });

    return {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      avatar_url: await resolveAvatarUrl(user.avatarUrl),
      bio: user.bio,
      institution: user.institution,
      reputation_score: user.reputationScore,
      is_verified: user.isVerified,
      resources: user.authoredResources.map(toResourceDto),
      stats: {
        total_resources: stats._count._all,
        total_downloads: stats._sum.downloadCount ?? 0,
        total_views: stats._sum.viewCount ?? 0,
      },
    };
  }

  static async getOwnProfile(userId: string): Promise<Record<string, unknown>> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.displayName,
      avatar_url: await resolveAvatarUrl(user.avatarUrl),
      bio: user.bio,
      institution: user.institution,
      location: user.location,
      website_url: user.websiteUrl,
      github_url: user.githubUrl,
      scholar_url: user.scholarUrl,
      kaggle_url: user.kaggleUrl,
      huggingface_url: user.huggingfaceUrl,
      linkedin_url: user.linkedinUrl,
      orcid_id: user.orcidId,
      x_url: user.xUrl,
      reputation_score: user.reputationScore,
      is_verified: user.isVerified,
      email_verified: user.emailVerified,
      created_at: user.createdAt,
      last_login_at: user.lastLoginAt,
      roles: await getUserRoleNames(user.id),
    };
  }

  static async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<Record<string, unknown>> {
    const before = await prisma.user.findUnique({ where: { id: userId } });
    if (!before || before.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: input.display_name,
        bio: input.bio,
        institution: input.institution,
        location: input.location,
        websiteUrl: input.website_url,
        githubUrl: input.github_url,
        scholarUrl: input.scholar_url,
        kaggleUrl: input.kaggle_url,
        huggingfaceUrl: input.huggingface_url,
        linkedinUrl: input.linkedin_url,
        orcidId: input.orcid_id,
        xUrl: input.x_url,
      },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'user.profile_update',
      targetType: 'user',
      targetId: userId,
      oldValue: {
        displayName: before.displayName,
        bio: before.bio,
        institution: before.institution,
      },
      newValue: input,
    });

    return this.getOwnProfile(userId);
  }

  static async uploadAvatar(userId: string, file: UploadedFile): Promise<{ avatar_url: string }> {
    const { key } = await StorageService.uploadAvatar(userId, file);

    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: key } });

    await writeAuditLog({
      actorId: userId,
      action: 'user.avatar_upload',
      targetType: 'user',
      targetId: userId,
      newValue: { key },
    });

    const avatarUrl = await StorageService.getSignedAvatarUrl(key);
    return { avatar_url: avatarUrl };
  }

  static async listBookmarks(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where = { userId };

    const [total, bookmarks] = await Promise.all([
      prisma.bookmark.count({ where }),
      prisma.bookmark.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: { resource: { include: resourceInclude } },
      }),
    ]);

    return {
      data: bookmarks.map((bookmark) => toResourceDto(bookmark.resource)),
      meta: buildPaginationMeta(total, pagination),
    };
  }

  static async addBookmark(userId: string, resourceId: string): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const existing = await prisma.bookmark.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'Resource is already bookmarked.');
    }

    await prisma.$transaction([
      prisma.bookmark.create({ data: { userId, resourceId } }),
      prisma.resource.update({
        where: { id: resourceId },
        data: { bookmarkCount: { increment: 1 } },
      }),
    ]);

    await writeAuditLog({
      actorId: userId,
      action: 'bookmark.add',
      targetType: 'resource',
      targetId: resourceId,
    });
  }

  static async removeBookmark(userId: string, resourceId: string): Promise<void> {
    const existing = await prisma.bookmark.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Bookmark not found.');
    }

    await prisma.$transaction([
      prisma.bookmark.delete({ where: { id: existing.id } }),
      prisma.resource.update({
        where: { id: resourceId },
        data: { bookmarkCount: { decrement: 1 } },
      }),
    ]);

    await writeAuditLog({
      actorId: userId,
      action: 'bookmark.remove',
      targetType: 'resource',
      targetId: resourceId,
    });
  }

  static async listSubmissions(
    userId: string,
    statusFilter: string | undefined,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where = {
      authorId: userId,
      deletedAt: null,
      ...(statusFilter ? { status: SUBMISSION_STATUS_MAP[statusFilter] } : {}),
    };

    const [total, resources] = await Promise.all([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        include: resourceInclude,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return { data: resources.map(toResourceDto), meta: buildPaginationMeta(total, pagination) };
  }

  static async getDashboard(userId: string): Promise<Record<string, unknown>> {
    const [statusCounts, resourceTotals, bookmarkCount, unreadNotifications, user] =
      await Promise.all([
        prisma.resource.groupBy({
          by: ['status'],
          where: { authorId: userId, deletedAt: null },
          _count: { _all: true },
        }),
        prisma.resource.aggregate({
          where: { authorId: userId, deletedAt: null },
          _sum: { viewCount: true, downloadCount: true },
        }),
        prisma.bookmark.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.user.findUnique({ where: { id: userId }, select: { reputationScore: true } }),
      ]);

    if (!user) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    const countByStatus = Object.fromEntries(
      statusCounts.map((row) => [row.status, row._count._all]),
    );
    const totalSubmissions = statusCounts.reduce((sum, row) => sum + row._count._all, 0);

    return {
      total_submissions: totalSubmissions,
      published_resources: countByStatus.approved ?? 0,
      pending_resources: countByStatus.pending ?? 0,
      rejected_resources: countByStatus.rejected ?? 0,
      bookmark_count: bookmarkCount,
      unread_notifications: unreadNotifications,
      reputation_score: user.reputationScore,
      total_views: resourceTotals._sum.viewCount ?? 0,
      total_downloads: resourceTotals._sum.downloadCount ?? 0,
    };
  }

  // --- Admin ------------------------------------------------------------------

  static async listUsersAdmin(
    query: ListUsersQuery,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.role) where.userRoles = { some: { role: { name: query.role } } };
    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput =
      query.sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: { userRoles: { include: { role: true } } },
      }),
    ]);

    const data = await Promise.all(
      users.map(async (user) =>
        toAdminUserDto(
          user,
          user.userRoles.map((userRole) => userRole.role.name),
          await resolveAvatarUrl(user.avatarUrl),
        ),
      ),
    );

    return { data, meta: buildPaginationMeta(total, pagination) };
  }

  static async getUserByIdAdmin(id: string): Promise<Record<string, unknown>> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    return toAdminUserDto(
      user,
      user.userRoles.map((userRole) => userRole.role.name),
      await resolveAvatarUrl(user.avatarUrl),
    );
  }

  static async updateUserAdmin(
    id: string,
    input: UpdateProfileInput,
    actorId: string,
  ): Promise<Record<string, unknown>> {
    const before = await prisma.user.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    await prisma.user.update({
      where: { id },
      data: {
        displayName: input.display_name,
        bio: input.bio,
        institution: input.institution,
        location: input.location,
        websiteUrl: input.website_url,
        githubUrl: input.github_url,
        scholarUrl: input.scholar_url,
        kaggleUrl: input.kaggle_url,
        huggingfaceUrl: input.huggingface_url,
        linkedinUrl: input.linkedin_url,
        orcidId: input.orcid_id,
        xUrl: input.x_url,
      },
    });

    await writeAuditLog({
      actorId,
      action: 'admin.user.update',
      targetType: 'user',
      targetId: id,
      oldValue: { displayName: before.displayName, bio: before.bio },
      newValue: input,
    });

    return this.getUserByIdAdmin(id);
  }

  static async updateUserStatus(
    id: string,
    input: UpdateUserStatusInput,
    actorId: string,
  ): Promise<Record<string, unknown>> {
    const before = await prisma.user.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    await prisma.user.update({ where: { id }, data: { status: input.status } });

    // Suspending/banning a user must not leave their existing sessions valid —
    // same "revoke on security-relevant change" pattern as password reset.
    if (input.status !== 'active') {
      await prisma.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });
    }

    await writeAuditLog({
      actorId,
      action: 'admin.user.status',
      targetType: 'user',
      targetId: id,
      oldValue: { status: before.status },
      newValue: { status: input.status },
    });

    return this.getUserByIdAdmin(id);
  }

  static async updateUserRoles(
    id: string,
    input: UpdateUserRolesInput,
    actorId: string,
  ): Promise<Record<string, unknown>> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    const roles = await prisma.role.findMany({ where: { name: { in: input.role_names } } });
    const foundNames = new Set(roles.map((role) => role.name));
    const missing = input.role_names.filter((name) => !foundNames.has(name));
    if (missing.length > 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Unknown role(s): ${missing.join(', ')}`);
    }

    const before = await getUserRoleNames(id);

    const actorRoles = await getUserRoleNames(actorId);
    const actorIsSuperAdmin = actorRoles.includes('super_admin');
    if (!actorIsSuperAdmin && (includesTopTierRole(input.role_names) || includesTopTierRole(before))) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'Only a super_admin can grant the admin/super_admin role, or change the roles of a user who already has one.',
      );
    }

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: id } }),
      prisma.userRole.createMany({
        data: roles.map((role) => ({ userId: id, roleId: role.id, assignedBy: actorId })),
      }),
    ]);

    await writeAuditLog({
      actorId,
      action: 'admin.user.role',
      targetType: 'user',
      targetId: id,
      oldValue: { roles: before },
      newValue: { roles: input.role_names },
    });

    return this.getUserByIdAdmin(id);
  }

  static async softDeleteUser(id: string, actorId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
      prisma.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      }),
    ]);

    await writeAuditLog({
      actorId,
      action: 'admin.user.delete',
      targetType: 'user',
      targetId: id,
      oldValue: { deletedAt: null },
      newValue: { deletedAt: new Date().toISOString() },
    });
  }
}
