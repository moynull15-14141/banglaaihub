import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { writeAuditLog } from '../utils/auditLog';
import { resolveContributorLevel } from '../utils/contributorLevel';
import { assertProfileViewable } from '../utils/profileVisibility';
import type { NotificationCategoryKey } from '../utils/notificationCategories';
import { getUserRoleNames } from './auth.service';
import { BadgeService } from './badge.service';
import { resourceInclude, toResourceDto } from './resources.service';
import { StorageService, type UploadedFile } from './storage.service';
import { UserSearchService } from './user-search.service';
import type { UpdateProfileInput } from '../validators/user.validator';
import type {
  ListUsersQuery,
  UpdateUserRolesInput,
  UpdateUserStatusInput,
} from '../validators/admin.validator';

const PUBLIC_PROFILE_RESOURCE_LIMIT = 10;
// Fields counted toward "profile completion" on the dashboard — a simple
// filled/total ratio, no weighting.
const PROFILE_COMPLETION_FIELDS = [
  'displayName',
  'bio',
  'headline',
  'avatarUrl',
  'coverImage',
  'institution',
  'location',
  'websiteUrl',
  'githubUrl',
] as const;

// Privilege-escalation guard for updateUserRoles: only a super_admin can
// grant admin/super_admin, or touch the roles of someone who already holds
// either — otherwise an admin could promote themselves (or anyone else) to
// super_admin, or silently demote an existing admin/super_admin.
const TOP_TIER_ROLES = ['admin', 'super_admin'];
const includesTopTierRole = (roleNames: string[]): boolean =>
  roleNames.some((name) => TOP_TIER_ROLES.includes(name));

// Self-account-action guard: no admin action here (role change, ban/suspend,
// delete) can ever target the actor's own account, regardless of tier. This
// prevents both accidental self-lockout (a mis-click removing your own
// super_admin role) and a compromised admin session self-banning to cover
// tracks. Ask another admin to act on your account instead — same discipline
// most platforms enforce for exactly this reason.
function assertNotSelfTarget(actorId: string, targetId: string, action: string): void {
  if (actorId === targetId) {
    throw new ApiError(403, 'FORBIDDEN', `You cannot ${action} your own account. Ask another admin to do it.`);
  }
}

// Last-super-admin guard: blocks any action that would leave the platform
// with zero super_admins (which nobody could then undo without a direct
// database edit). Only fires when the target actually holds super_admin —
// demoting/banning/deleting a non-super_admin is never affected.
async function assertNotLastSuperAdmin(targetId: string): Promise<void> {
  const targetRoles = await getUserRoleNames(targetId);
  if (!targetRoles.includes('super_admin')) return;

  const superAdminCount = await prisma.userRole.count({ where: { role: { name: 'super_admin' } } });
  if (superAdminCount <= 1) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'This is the last super_admin — promote another user to super_admin first.',
    );
  }
}

// The Users page's "Staff" scope (see listUsersAdmin) — every role that
// grants some admin-panel page (mirrors frontend/src/components/admin/
// adminNavLinks.ts's ADMIN_NAV_LINKS, plus `moderator`, which carries
// moderation permissions per seed.ts's matrix even though no nav link
// gates on it yet). Deliberately excludes contributor/verified_contributor
// — those are a content-trust tier every regular member can earn, not
// website-management access.
const STAFF_ROLES = ['moderator', 'editor', 'admin', 'super_admin'];

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

function resolveAvatarUrl(key: string | null): Promise<string | null> {
  return StorageService.resolveAvatarUrl(key);
}

async function resolveCoverImageUrl(key: string | null): Promise<string | null> {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  return StorageService.getSignedCoverUrl(key);
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
  static async resolveIdByUsername(username: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true, deletedAt: true } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }
    return user.id;
  }

  static async getPublicProfile(
    username: string,
    viewerId: string | null = null,
    viewerIsAdmin = false,
  ): Promise<Record<string, unknown>> {
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
    await assertProfileViewable(user, viewerId, viewerIsAdmin);

    const [stats, pinnedResources, badges, isFollowing, isFollowedBy] = await Promise.all([
      prisma.resource.aggregate({
        where: { authorId: user.id, status: 'approved', deletedAt: null },
        _count: { _all: true },
        _sum: { downloadCount: true, viewCount: true },
      }),
      prisma.pinnedResource.findMany({
        where: { userId: user.id, resource: { status: 'approved', deletedAt: null } },
        orderBy: { position: 'asc' },
        include: { resource: { include: resourceInclude } },
      }),
      BadgeService.listForUser(username, viewerId, viewerIsAdmin),
      viewerId
        ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } })
        : null,
      viewerId
        ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: viewerId } } })
        : null,
    ]);

    const contributorLevel = resolveContributorLevel(user.reputationScore);

    return {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      avatar_url: await resolveAvatarUrl(user.avatarUrl),
      cover_image: await resolveCoverImageUrl(user.coverImage),
      bio: user.bio,
      headline: user.headline,
      institution: user.institution,
      location: user.location,
      website_url: user.websiteUrl,
      github_url: user.githubUrl,
      gitlab_url: user.gitlabUrl,
      scholar_url: user.scholarUrl,
      kaggle_url: user.kaggleUrl,
      huggingface_url: user.huggingfaceUrl,
      linkedin_url: user.linkedinUrl,
      orcid_id: user.orcidId,
      x_url: user.xUrl,
      research_interests: user.researchInterests,
      skills: user.skills,
      languages: user.languages,
      profile_visibility: user.profileVisibility,
      reputation_score: user.reputationScore,
      contributor_level: contributorLevel.level,
      contributor_next_level: contributorLevel.nextLevel,
      contributor_next_threshold: contributorLevel.nextThreshold,
      is_verified: user.isVerified,
      follower_count: user.followerCount,
      following_count: user.followingCount,
      is_following: Boolean(isFollowing),
      is_followed_by: Boolean(isFollowedBy),
      is_mutual: Boolean(isFollowing) && Boolean(isFollowedBy),
      badges,
      pinned_resources: await Promise.all(pinnedResources.map((pin) => toResourceDto(pin.resource))),
      resources: await Promise.all(user.authoredResources.map(toResourceDto)),
      created_at: user.createdAt,
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

    const contributorLevel = resolveContributorLevel(user.reputationScore);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.displayName,
      avatar_url: await resolveAvatarUrl(user.avatarUrl),
      cover_image: await resolveCoverImageUrl(user.coverImage),
      bio: user.bio,
      headline: user.headline,
      institution: user.institution,
      location: user.location,
      website_url: user.websiteUrl,
      github_url: user.githubUrl,
      gitlab_url: user.gitlabUrl,
      scholar_url: user.scholarUrl,
      kaggle_url: user.kaggleUrl,
      huggingface_url: user.huggingfaceUrl,
      linkedin_url: user.linkedinUrl,
      orcid_id: user.orcidId,
      x_url: user.xUrl,
      research_interests: user.researchInterests,
      skills: user.skills,
      languages: user.languages,
      profile_visibility: user.profileVisibility,
      reputation_score: user.reputationScore,
      contributor_level: contributorLevel.level,
      contributor_next_level: contributorLevel.nextLevel,
      contributor_next_threshold: contributorLevel.nextThreshold,
      is_verified: user.isVerified,
      email_verified: user.emailVerified,
      follower_count: user.followerCount,
      following_count: user.followingCount,
      created_at: user.createdAt,
      last_login_at: user.lastLoginAt,
      roles: await getUserRoleNames(user.id),
      // Settings' Security/Google Account tabs need this to know which sign-in
      // methods actually apply — a user can have either, both, or (mid-OAuth
      // registration) neither, so nothing about auth method may be assumed.
      has_password: Boolean(user.passwordHash),
      has_google: Boolean(user.googleId),
      muted_notification_categories: user.mutedNotificationCategories,
    };
  }

  // Settings > Notifications' per-category toggle. Stores only the *muted*
  // keys (see notificationCategories.ts) — enabling a category removes it
  // from the array, disabling adds it, so an empty array (every new user's
  // default) means everything is on with no migration/backfill needed.
  static async updateNotificationPreference(
    userId: string,
    category: NotificationCategoryKey,
    enabled: boolean,
  ): Promise<{ muted_notification_categories: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mutedNotificationCategories: true },
    });
    if (!user) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    const withoutCategory = user.mutedNotificationCategories.filter((key) => key !== category);
    const nextMuted = enabled ? withoutCategory : [...withoutCategory, category];

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { mutedNotificationCategories: nextMuted },
      select: { mutedNotificationCategories: true },
    });

    return { muted_notification_categories: updated.mutedNotificationCategories };
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
        headline: input.headline,
        institution: input.institution,
        location: input.location,
        websiteUrl: input.website_url,
        githubUrl: input.github_url,
        gitlabUrl: input.gitlab_url,
        scholarUrl: input.scholar_url,
        kaggleUrl: input.kaggle_url,
        huggingfaceUrl: input.huggingface_url,
        linkedinUrl: input.linkedin_url,
        orcidId: input.orcid_id,
        xUrl: input.x_url,
        researchInterests: input.research_interests,
        skills: input.skills,
        languages: input.languages,
        profileVisibility: input.visibility,
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

    void UserSearchService.indexUser(userId);

    return this.getOwnProfile(userId);
  }

  static async uploadAvatar(userId: string, file: UploadedFile): Promise<{ avatar_url: string }> {
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
    const { key } = await StorageService.uploadAvatar(userId, file);

    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: key } });

    // Best-effort: the DB already points at the new avatar, so a failure to
    // delete the old object only leaves it orphaned in R2, never breaks the
    // response.
    await StorageService.deleteObject(existing?.avatarUrl).catch(() => {});

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

  static async uploadCoverImage(userId: string, file: UploadedFile): Promise<{ cover_image: string }> {
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { coverImage: true } });
    const { key } = await StorageService.uploadCoverImage(userId, file);

    await prisma.user.update({ where: { id: userId }, data: { coverImage: key } });
    await StorageService.deleteObject(existing?.coverImage).catch(() => {});

    await writeAuditLog({
      actorId: userId,
      action: 'user.cover_image_upload',
      targetType: 'user',
      targetId: userId,
      newValue: { key },
    });

    const coverImageUrl = await StorageService.getSignedCoverUrl(key);
    return { cover_image: coverImageUrl };
  }

  static async removeCoverImage(userId: string): Promise<void> {
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { coverImage: true } });
    if (!existing?.coverImage) return;

    await prisma.user.update({ where: { id: userId }, data: { coverImage: null } });
    await StorageService.deleteObject(existing.coverImage).catch(() => {});

    await writeAuditLog({
      actorId: userId,
      action: 'user.cover_image_remove',
      targetType: 'user',
      targetId: userId,
    });
  }

  static async listBookmarks(
    userId: string,
    pagination: PaginationParams,
    sort?: string,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where = { userId };
    const orderBy: Prisma.BookmarkOrderByWithRelationInput =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'popular'
          ? { resource: { viewCount: 'desc' } }
          : sort === 'downloads'
            ? { resource: { downloadCount: 'desc' } }
            : { createdAt: 'desc' };

    const [total, bookmarks] = await Promise.all([
      prisma.bookmark.count({ where }),
      prisma.bookmark.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: { resource: { include: resourceInclude } },
      }),
    ]);

    // Every resource here is bookmarked by definition (that's what this
    // query selects) — cheaper and safer than re-deriving it per row the
    // way getBySlug() does for a single arbitrary resource.
    const data = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const dto = await toResourceDto(bookmark.resource);
        dto.is_bookmarked = true;
        dto.bookmarked_at = bookmark.createdAt;
        return dto;
      }),
    );

    return { data, meta: buildPaginationMeta(total, pagination) };
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

    await prisma.resourceAnalytics.create({
      data: { resourceId, eventType: 'bookmark', userId },
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

    return { data: await Promise.all(resources.map(toResourceDto)), meta: buildPaginationMeta(total, pagination) };
  }

  static async getDashboard(userId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const [
      statusCounts,
      resourceTotals,
      bookmarkCount,
      unreadNotifications,
      user,
      shareCount,
      mostDownloaded,
      recentDownloads,
      recentFollowers,
      pinnedResources,
      totalUsers,
      totalPlatformResources,
      thisMonthViews,
      lastMonthViews,
      thisMonthDownloads,
      lastMonthDownloads,
      thisMonthSubmissions,
      lastMonthSubmissions,
    ] = await Promise.all([
      prisma.resource.groupBy({
        by: ['status'],
        where: { authorId: userId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.resource.aggregate({
        where: { authorId: userId, deletedAt: null },
        _sum: { viewCount: true, downloadCount: true, bookmarkCount: true },
      }),
      prisma.bookmark.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.user.findUnique({ where: { id: userId } }),
      // No dedicated share_count column (see ResourceService.logShare) —
      // counted from the analytics events themselves.
      prisma.resourceAnalytics.count({
        where: { eventType: 'share', resource: { authorId: userId, deletedAt: null } },
      }),
      prisma.resource.findFirst({
        where: { authorId: userId, deletedAt: null, downloadCount: { gt: 0 } },
        orderBy: { downloadCount: 'desc' },
        select: { id: true, slug: true, title: true, type: true, downloadCount: true },
      }),
      prisma.resourceAnalytics.findMany({
        where: { eventType: 'download', resource: { authorId: userId, deletedAt: null } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { resource: { select: { id: true, slug: true, title: true, type: true } } },
      }),
      prisma.follow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          follower: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
        },
      }),
      prisma.pinnedResource.findMany({
        where: { userId, resource: { status: 'approved', deletedAt: null } },
        orderBy: { position: 'asc' },
        include: { resource: { include: resourceInclude } },
      }),
      prisma.user.count({ where: { deletedAt: null, status: 'active' } }),
      prisma.resource.count({ where: { status: 'approved', deletedAt: null } }),
      prisma.resourceAnalytics.count({
        where: { eventType: 'view', resource: { authorId: userId, deletedAt: null }, createdAt: { gte: startOfThisMonth } },
      }),
      prisma.resourceAnalytics.count({
        where: {
          eventType: 'view',
          resource: { authorId: userId, deletedAt: null },
          createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        },
      }),
      prisma.resourceAnalytics.count({
        where: { eventType: 'download', resource: { authorId: userId, deletedAt: null }, createdAt: { gte: startOfThisMonth } },
      }),
      prisma.resourceAnalytics.count({
        where: {
          eventType: 'download',
          resource: { authorId: userId, deletedAt: null },
          createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        },
      }),
      prisma.resource.count({ where: { authorId: userId, deletedAt: null, createdAt: { gte: startOfThisMonth } } }),
      prisma.resource.count({
        where: { authorId: userId, deletedAt: null, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
      }),
    ]);

    if (!user) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    const countByStatus = Object.fromEntries(
      statusCounts.map((row) => [row.status, row._count._all]),
    );
    const totalSubmissions = statusCounts.reduce((sum, row) => sum + row._count._all, 0);

    const filledFieldCount = PROFILE_COMPLETION_FIELDS.filter((field) => Boolean(user[field])).length;
    const profileCompletionPercent = Math.round((filledFieldCount / PROFILE_COMPLETION_FIELDS.length) * 100);

    return {
      total_submissions: totalSubmissions,
      published_resources: countByStatus.approved ?? 0,
      pending_resources: countByStatus.pending ?? 0,
      rejected_resources: countByStatus.rejected ?? 0,
      // Bookmarks this user has personally made on any resource — kept as-is
      // for backward compatibility with existing dashboard callers.
      bookmark_count: bookmarkCount,
      unread_notifications: unreadNotifications,
      reputation_score: user.reputationScore,
      total_views: resourceTotals._sum.viewCount ?? 0,
      total_downloads: resourceTotals._sum.downloadCount ?? 0,
      // Bookmarks/shares this user's own resources have *received* — the
      // creator-facing counterpart to bookmark_count above.
      total_bookmarks_received: resourceTotals._sum.bookmarkCount ?? 0,
      total_shares: shareCount,
      most_downloaded_resource: mostDownloaded
        ? {
            id: mostDownloaded.id,
            slug: mostDownloaded.slug,
            title: mostDownloaded.title,
            type: mostDownloaded.type,
            download_count: mostDownloaded.downloadCount,
          }
        : null,
      recent_downloads: recentDownloads.map((event) => ({
        resource: {
          id: event.resource.id,
          slug: event.resource.slug,
          title: event.resource.title,
          type: event.resource.type,
        },
        downloaded_at: event.createdAt,
      })),
      // --- Phase 4B ---------------------------------------------------------
      follower_count: user.followerCount,
      following_count: user.followingCount,
      profile_completion_percent: profileCompletionPercent,
      recent_followers: await Promise.all(
        recentFollowers.map(async (row) => ({
          id: row.follower.id,
          username: row.follower.username,
          display_name: row.follower.displayName,
          avatar_url: await resolveAvatarUrl(row.follower.avatarUrl),
          is_verified: row.follower.isVerified,
          followed_at: row.createdAt,
        })),
      ),
      pinned_resources: await Promise.all(pinnedResources.map((pin) => toResourceDto(pin.resource))),
      community_stats: {
        total_users: totalUsers,
        total_resources: totalPlatformResources,
      },
      monthly_summary: {
        views: { this_month: thisMonthViews, last_month: lastMonthViews },
        downloads: { this_month: thisMonthDownloads, last_month: lastMonthDownloads },
        submissions: { this_month: thisMonthSubmissions, last_month: lastMonthSubmissions },
      },
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
    if (query.scope === 'staff') where.userRoles = { some: { role: { name: { in: STAFF_ROLES } } } };
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
        headline: input.headline,
        institution: input.institution,
        location: input.location,
        websiteUrl: input.website_url,
        githubUrl: input.github_url,
        gitlabUrl: input.gitlab_url,
        scholarUrl: input.scholar_url,
        kaggleUrl: input.kaggle_url,
        huggingfaceUrl: input.huggingface_url,
        linkedinUrl: input.linkedin_url,
        orcidId: input.orcid_id,
        xUrl: input.x_url,
        researchInterests: input.research_interests,
        skills: input.skills,
        languages: input.languages,
        profileVisibility: input.visibility,
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

    assertNotSelfTarget(actorId, id, 'change the status of');
    if (input.status !== 'active') {
      await assertNotLastSuperAdmin(id);
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

    assertNotSelfTarget(actorId, id, 'change the roles of');
    if (!input.role_names.includes('super_admin')) {
      await assertNotLastSuperAdmin(id);
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

    assertNotSelfTarget(actorId, id, 'delete');
    await assertNotLastSuperAdmin(id);

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

  // --- Phase 4B — admin profile moderation ------------------------------------

  static async setVerified(id: string, verified: boolean, actorId: string): Promise<unknown> {
    const before = await prisma.user.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    await prisma.user.update({ where: { id }, data: { isVerified: verified } });

    await writeAuditLog({
      actorId,
      action: verified ? 'admin.user.verify' : 'admin.user.unverify',
      targetType: 'user',
      targetId: id,
      oldValue: { isVerified: before.isVerified },
      newValue: { isVerified: verified },
    });

    void UserSearchService.indexUser(id);

    if (verified) {
      await BadgeService.checkAndAwardMilestones(id);
    }

    return this.getUserByIdAdmin(id);
  }

  static async adminResetCoverImage(id: string, actorId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id }, select: { coverImage: true, deletedAt: true } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }
    if (!user.coverImage) return;

    await prisma.user.update({ where: { id }, data: { coverImage: null } });
    await StorageService.deleteObject(user.coverImage).catch(() => {});

    await writeAuditLog({
      actorId,
      action: 'admin.user.reset_cover_image',
      targetType: 'user',
      targetId: id,
    });
  }
}
