import { prisma } from '../config/database';
import { meilisearchClient, USERS_INDEX_UID } from '../config/meilisearch';
import { resolveContributorLevel } from '../utils/contributorLevel';
import { StorageService } from './storage.service';
import type { PaginationParams } from '../utils/pagination';

export interface UserSearchDocument {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  institution: string | null;
  location: string | null;
  skills: string[];
  research_interests: string[];
  is_verified: boolean;
  contributor_level: string;
  reputation_score: number;
  badge_keys: string[];
  created_at: string;
}

type UserWithBadges = Awaited<ReturnType<typeof fetchUserForIndex>>;

async function fetchUserForIndex(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { badges: { include: { badge: true } } },
  });
}

function toUserSearchDocument(user: UserWithBadges): UserSearchDocument {
  return {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    headline: user.headline,
    institution: user.institution,
    location: user.location,
    skills: user.skills,
    research_interests: user.researchInterests,
    is_verified: user.isVerified,
    contributor_level: resolveContributorLevel(user.reputationScore).level,
    reputation_score: user.reputationScore,
    badge_keys: user.badges.map((userBadge) => userBadge.badge.key),
    created_at: user.createdAt.toISOString(),
  };
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export class UserSearchService {
  private static get index() {
    return meilisearchClient.index<UserSearchDocument>(USERS_INDEX_UID);
  }

  private static async ensureIndexExists(): Promise<void> {
    try {
      await meilisearchClient.createIndex(USERS_INDEX_UID, { primaryKey: 'id' }).waitTask();
    } catch (error) {
      const code = (error as { cause?: { code?: string } } | undefined)?.cause?.code;
      if (code !== 'index_already_exists') {
        throw error;
      }
    }
  }

  static async configureIndex(): Promise<void> {
    await this.ensureIndexExists();
    await this.index.updateSettings({
      searchableAttributes: ['username', 'display_name', 'institution', 'skills', 'research_interests', 'headline'],
      filterableAttributes: ['is_verified', 'contributor_level', 'skills', 'research_interests', 'badge_keys'],
      sortableAttributes: ['reputation_score', 'created_at'],
    });
  }

  // Fire-and-forget from callers (same void pattern as ResourceService's
  // syncSearchIndex) — never blocks or fails a profile update/verify/badge action.
  static async indexUser(userId: string): Promise<void> {
    try {
      const user = await fetchUserForIndex(userId);
      if (user.deletedAt || user.status !== 'active') {
        await this.deleteUser(userId);
        return;
      }
      await this.ensureIndexExists();
      await this.index.addDocuments([toUserSearchDocument(user)]);
    } catch {
      // Best-effort — a MeiliSearch outage must never fail the primary write.
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    await this.ensureIndexExists();
    await this.index.deleteDocument(userId);
  }

  static async rebuildIndex(): Promise<{ count: number }> {
    await this.ensureIndexExists();

    const users = await prisma.user.findMany({
      where: { deletedAt: null, status: 'active' },
      include: { badges: { include: { badge: true } } },
    });

    await this.index.deleteAllDocuments();
    if (users.length > 0) {
      await this.index.addDocuments(users.map(toUserSearchDocument));
    }

    return { count: users.length };
  }

  static async search(
    query: {
      q: string;
      verified?: boolean;
      contributor_level?: string;
      skills?: string[];
      research_interest?: string;
    },
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: { total: number; page: number; limit: number; hasNextPage: boolean } }> {
    // Same fix as SearchService.search() — an index that doesn't exist yet
    // throws index_not_found instead of returning zero hits.
    await this.ensureIndexExists();

    const filters: string[] = [];
    if (query.verified) filters.push('is_verified = true');
    if (query.contributor_level) filters.push(`contributor_level = "${escapeFilterValue(query.contributor_level)}"`);
    if (query.skills && query.skills.length > 0) {
      filters.push(`(${query.skills.map((skill) => `skills = "${escapeFilterValue(skill)}"`).join(' OR ')})`);
    }
    if (query.research_interest) {
      filters.push(`research_interests = "${escapeFilterValue(query.research_interest)}"`);
    }

    const response = await this.index.search(query.q, {
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      page: pagination.page,
      hitsPerPage: pagination.limit,
    });
    const finiteResponse = response as typeof response & {
      totalHits: number;
      page: number;
      hitsPerPage: number;
    };

    // The index stores User.avatarUrl's raw R2 key as-is (see
    // toUserSearchDocument) — a signed URL would go stale before the next
    // reindex, so it's resolved here at read time instead, same as every
    // other DTO that echoes an avatar back (StorageService.resolveAvatarUrl's
    // own comment).
    const data = await Promise.all(
      finiteResponse.hits.map(async (hit) => ({
        ...hit,
        avatar_url: await StorageService.resolveAvatarUrl(hit.avatar_url),
      })),
    );

    return {
      data,
      meta: {
        total: finiteResponse.totalHits,
        page: finiteResponse.page,
        limit: finiteResponse.hitsPerPage,
        hasNextPage: finiteResponse.page * finiteResponse.hitsPerPage < finiteResponse.totalHits,
      },
    };
  }
}
