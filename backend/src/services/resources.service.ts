import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import type { AccessTokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { ensureUniqueSlug, slugify } from '../utils/slugify';
import { writeAuditLog } from '../utils/auditLog';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { ReputationService } from './reputation.service';
import { SearchService } from './search.service';
import { StorageService, type UploadedFile } from './storage.service';
import type {
  CreateCategoryInput,
  CreateResourceInput,
  ListResourcesQuery,
  UpdateCategoryInput,
  UpdateResourceInput,
} from '../validators/resource.validator';

export const resourceInclude = {
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  approver: { select: { id: true, username: true, displayName: true } },
  category: { select: { id: true, name: true, slug: true } },
  resourceTags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  dataset: true,
  paper: true,
  tool: true,
} satisfies Prisma.ResourceInclude;

export type ResourceWithRelations = Prisma.ResourceGetPayload<{ include: typeof resourceInclude }>;
type CategoryRow = Prisma.CategoryGetPayload<Record<string, never>>;
type TagRow = Prisma.TagGetPayload<Record<string, never>>;

const MODERATION_PERMISSIONS = ['resource:approve', 'resource:edit_any'];

// Doc 14's Reputation Formula Details table — the more detailed, dedicated
// spec (also matches the tiers already shipped in ReputationBadge.tsx),
// used in preference to doc 10's shorter summary table where the two
// differ (doc 10 groups tool with prompt at +10; doc 14 groups tool with
// tutorial at +20). project/news have no documented point value in either
// doc, so they intentionally award nothing rather than guessing a number.
const RESOURCE_APPROVAL_POINTS: Partial<Record<string, number>> = {
  dataset: 50,
  paper: 30,
  tutorial: 20,
  tool: 20,
  prompt: 10,
};
const SUBMISSION_REJECTED_POINTS = -5;

// Mirrors frontend/src/lib/constants/routes.ts's resourceHref() so a
// notification's `link` field opens the same page the site itself would
// navigate to for this resource type.
function resourceLink(type: string, slug: string): string {
  switch (type) {
    case 'dataset':
      return `/datasets/${slug}`;
    case 'paper':
      return `/papers/${slug}`;
    case 'tool':
      return `/tools/${slug}`;
    default:
      return `/resources/${slug}`;
  }
}

export type UploadKind = 'dataset' | 'thumbnail' | 'pdf' | 'asset' | 'documentation';

// thumbnail_url/documentation_url/paper.pdf_url can each be either a
// user-pasted external URL or a previously-uploaded R2 key (see
// StorageService.resolveUrl) — only delete-on-replace when the previous
// value was actually ours to delete, never when it was just a link someone
// typed in.
function objectKeyOrNull(value: string | null): string | null {
  if (!value || /^https?:\/\//i.test(value)) return null;
  return value;
}

// Async because thumbnail_url/documentation_url/dataset.file_url/
// paper.pdf_url/tool.file_url may each be either a plain external URL
// (passed through unchanged, the pre-existing behavior) or an R2 object key
// (resolved to a short-lived signed URL, exactly like avatars already do via
// StorageService.resolveUrl) — the raw key itself is never returned.
export async function toResourceDto(resource: ResourceWithRelations): Promise<Record<string, unknown>> {
  const [thumbnailUrl, documentationUrl, datasetFileUrl, paperPdfUrl, toolFileUrl] = await Promise.all([
    StorageService.resolveUrl(resource.thumbnailUrl),
    StorageService.resolveUrl(resource.documentationUrl),
    resource.dataset ? StorageService.resolveUrl(resource.dataset.fileUrl) : null,
    resource.paper ? StorageService.resolveUrl(resource.paper.pdfUrl) : null,
    resource.tool ? StorageService.resolveUrl(resource.tool.fileUrl) : null,
  ]);

  return {
    id: resource.id,
    slug: resource.slug,
    title: resource.title,
    description: resource.description,
    type: resource.type,
    status: resource.status,
    visibility: resource.visibility,
    language: resource.language,
    license: resource.license,
    external_url: resource.externalUrl,
    thumbnail_url: thumbnailUrl,
    documentation_url: documentationUrl,
    author: resource.author
      ? {
          id: resource.author.id,
          username: resource.author.username,
          display_name: resource.author.displayName,
          avatar_url: resource.author.avatarUrl,
        }
      : null,
    category: resource.category,
    tags: resource.resourceTags.map((rt) => rt.tag.name),
    view_count: resource.viewCount,
    download_count: resource.downloadCount,
    bookmark_count: resource.bookmarkCount,
    featured: resource.featured,
    approved_by: resource.approver
      ? {
          id: resource.approver.id,
          username: resource.approver.username,
          display_name: resource.approver.displayName,
        }
      : null,
    approved_at: resource.approvedAt,
    published_at: resource.publishedAt,
    created_at: resource.createdAt,
    updated_at: resource.updatedAt,
    dataset: resource.dataset
      ? {
          version: resource.dataset.version,
          file_url: datasetFileUrl,
          file_size_bytes: resource.dataset.fileSizeBytes?.toString() ?? null,
          file_format: resource.dataset.fileFormat,
          record_count: resource.dataset.recordCount,
          annotation_type: resource.dataset.annotationType,
          domain: resource.dataset.domain,
          collection_year: resource.dataset.collectionYear,
          data_source: resource.dataset.dataSource,
          methodology: resource.dataset.methodology,
          checksum_sha256: resource.dataset.checksumSha256,
          parent_id: resource.dataset.parentId,
        }
      : null,
    paper: resource.paper
      ? {
          abstract: resource.paper.abstract,
          authors: resource.paper.authors,
          venue: resource.paper.venue,
          year: resource.paper.year,
          doi: resource.paper.doi,
          arxiv_id: resource.paper.arxivId,
          pdf_url: paperPdfUrl,
          code_url: resource.paper.codeUrl,
          citation_count: resource.paper.citationCount,
        }
      : null,
    tool: resource.tool
      ? {
          tool_type: resource.tool.toolType,
          platform: resource.tool.platform,
          demo_url: resource.tool.demoUrl,
          install_command: resource.tool.installCommand,
          file_url: toolFileUrl,
          file_size_bytes: resource.tool.fileSizeBytes?.toString() ?? null,
          checksum_sha256: resource.tool.checksumSha256,
        }
      : null,
  };
}

function toCategoryDto(category: CategoryRow): Record<string, unknown> {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parent_id: category.parentId,
    icon: category.icon,
    sort_order: category.sortOrder,
  };
}

function toTagDto(tag: TagRow): Record<string, unknown> {
  return { id: tag.id, name: tag.name, slug: tag.slug, usage_count: tag.usageCount };
}

function resolveSort(sort?: string): Prisma.ResourceOrderByWithRelationInput {
  switch (sort) {
    case 'oldest':
      return { createdAt: 'asc' };
    case 'popular':
      return { viewCount: 'desc' };
    case 'downloads':
      return { downloadCount: 'desc' };
    case 'bookmarks':
      return { bookmarkCount: 'desc' };
    default:
      return { createdAt: 'desc' };
  }
}

async function linkTags(
  tx: Prisma.TransactionClient,
  resourceId: string,
  tagNames: string[],
): Promise<void> {
  for (const rawName of tagNames) {
    const name = rawName.trim().toLowerCase();
    if (!name) continue;

    const tag = await tx.tag.upsert({
      where: { name },
      update: { usageCount: { increment: 1 } },
      create: { name, slug: slugify(name), usageCount: 1 },
    });

    await tx.resourceTag.upsert({
      where: { resourceId_tagId: { resourceId, tagId: tag.id } },
      update: {},
      create: { resourceId, tagId: tag.id },
    });
  }
}

async function assertCanModify(
  resource: { authorId: string | null },
  requester: AccessTokenPayload,
  action: 'edit' | 'delete',
): Promise<void> {
  const isOwner = resource.authorId === requester.userId;
  const ownPermission = action === 'edit' ? 'resource:edit_own' : 'resource:delete_own';
  const permissions = await AuthService.getUserPermissions(requester.userId);

  if (isOwner && permissions.has(ownPermission)) return;
  if (action === 'edit' && permissions.has('resource:edit_any')) return;

  throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to modify this resource.');
}

async function wouldCreateCycle(categoryId: number, proposedParentId: number): Promise<boolean> {
  let currentId: number | null = proposedParentId;
  const visited = new Set<number>();

  while (currentId !== null) {
    if (currentId === categoryId) return true;
    if (visited.has(currentId)) return true;
    visited.add(currentId);

    const current: { parentId: number | null } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }

  return false;
}

export class ResourceService {
  private static async getResourceWithRelations(id: string): Promise<ResourceWithRelations> {
    const resource = await prisma.resource.findUnique({ where: { id }, include: resourceInclude });
    if (!resource) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
    return resource;
  }

  // Best-effort search sync: a MeiliSearch outage must never fail the primary
  // Postgres write it's triggered from, so failures are logged, not thrown.
  private static async syncSearchIndex(resourceId: string): Promise<void> {
    try {
      const resource = await this.getResourceWithRelations(resourceId);
      await SearchService.updateResource(resource);
    } catch (error) {
      logger.warn('Search index sync failed', {
        resourceId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  static async resolveIdBySlug(slug: string): Promise<string> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      select: { id: true, deletedAt: true },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
    return resource.id;
  }

  static async list(
    query: ListResourcesQuery,
    pagination: PaginationParams,
    requester?: AccessTokenPayload,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where: Prisma.ResourceWhereInput = { deletedAt: null };

    if (query.type) where.type = query.type;
    if (query.language) where.language = query.language;
    if (query.category) where.category = { slug: query.category };
    if (query.featured) where.featured = true;

    let canModerate = false;
    if (requester) {
      const permissions = await AuthService.getUserPermissions(requester.userId);
      canModerate = MODERATION_PERMISSIONS.some((permission) => permissions.has(permission));
    }

    where.status = query.status && canModerate ? query.status : 'approved';

    const [total, resources] = await Promise.all([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        include: resourceInclude,
        orderBy: resolveSort(query.sort),
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return { data: await Promise.all(resources.map(toResourceDto)), meta: buildPaginationMeta(total, pagination) };
  }

  // Shared by getBySlug()/getDownloadUrl() — a non-approved resource is only
  // visible to its own author or someone with a moderation permission.
  // Pending/rejected/flagged resources 404 for everyone else, same as if
  // they didn't exist (never leaks that a pending resource exists at all).
  private static async assertCanView(
    resource: { authorId: string | null; status: string },
    requester?: AccessTokenPayload,
  ): Promise<void> {
    if (resource.status === 'approved') return;

    const isOwner = requester?.userId === resource.authorId;
    let canModerate = false;
    if (requester) {
      const permissions = await AuthService.getUserPermissions(requester.userId);
      canModerate = MODERATION_PERMISSIONS.some((permission) => permissions.has(permission));
    }
    if (!isOwner && !canModerate) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
  }

  static async getBySlug(slug: string, requester?: AccessTokenPayload): Promise<unknown> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      include: resourceInclude,
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await this.assertCanView(resource, requester);

    // Awaited for the same reason as the download_count increment below —
    // a void'd write here was found (this phase) to be lossy under
    // process-exit pressure in short-lived scripts; safe either way in the
    // long-running server, but reliability is worth the small latency cost.
    await prisma.resource.update({
      where: { id: resource.id },
      data: { viewCount: { increment: 1 } },
    });

    await prisma.resourceAnalytics.create({
      data: { resourceId: resource.id, eventType: 'view', userId: requester?.userId ?? null },
    });

    return toResourceDto(resource);
  }

  // GET /resources/:slug/download — one unified endpoint for whichever file
  // the resource type actually has (dataset.file_url / tool.file_url /
  // paper.pdf_url); everything else has nothing downloadable. Never returns
  // the raw R2 key — always a signed URL (or the external URL unchanged, if
  // that's what's stored), same resolution StorageService.resolveUrl already
  // uses for every other field.
  static async getDownloadUrl(
    slug: string,
    requester?: AccessTokenPayload,
  ): Promise<{ url: string }> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      include: { dataset: true, paper: true, tool: true },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await this.assertCanView(resource, requester);

    const key =
      resource.type === 'dataset'
        ? (resource.dataset?.fileUrl ?? null)
        : resource.type === 'tool'
          ? (resource.tool?.fileUrl ?? null)
          : resource.type === 'paper'
            ? (resource.paper?.pdfUrl ?? null)
            : null;

    if (!key) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'This resource has no downloadable file.');
    }

    const url = await StorageService.resolveUrl(key);
    if (!url) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'This resource has no downloadable file.');
    }

    // Awaited, not fire-and-forget — Phase 2A found that void'd counter
    // increments can be lost under process-exit pressure (Node cuts off
    // in-flight I/O), which is fine for a long-running server process but
    // made analytics writes unreliable to verify; download_count is a
    // real user-facing stat, so it's worth the extra ~10ms.
    await prisma.resource.update({
      where: { id: resource.id },
      data: { downloadCount: { increment: 1 } },
    });

    await prisma.resourceAnalytics.create({
      data: { resourceId: resource.id, eventType: 'download', userId: requester?.userId ?? null },
    });

    await writeAuditLog({
      actorId: requester?.userId ?? null,
      action: 'resource.download',
      targetType: 'resource',
      targetId: resource.id,
    });

    return { url };
  }

  // POST /resources/:slug/share — logs a ResourceAnalytics 'share' event.
  // There's no dedicated share_count column (doc 10 only defines view/
  // download/bookmark counters on the base Resource); the analytics event
  // count itself is the share count, read on demand rather than duplicated
  // into a second, cache-able-to-drift counter.
  static async logShare(slug: string, requester?: AccessTokenPayload): Promise<void> {
    const resourceId = await this.resolveIdBySlug(slug);
    await prisma.resourceAnalytics.create({
      data: { resourceId, eventType: 'share', userId: requester?.userId ?? null },
    });
  }

  static async create(
    authorId: string,
    input: CreateResourceInput,
  ): Promise<{ id: string; slug: string; status: string; message: string }> {
    const baseSlug = slugify(input.title);
    const slug = await ensureUniqueSlug(baseSlug, async (candidate) => {
      const existing = await prisma.resource.findUnique({ where: { slug: candidate } });
      return existing !== null;
    });

    const created = await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.create({
        data: {
          slug,
          title: input.title,
          description: input.description ?? null,
          type: input.type,
          categoryId: input.category_id ?? null,
          authorId,
          language: input.language ?? 'bn',
          license: input.license ?? null,
          externalUrl: input.external_url ?? null,
          thumbnailUrl: input.thumbnail_url ?? null,
          status: 'pending',
        },
      });

      if (input.type === 'dataset') {
        let parentId: string | null = null;

        if (input.dataset?.parent_dataset_slug) {
          const parentResource = await tx.resource.findUnique({
            where: { slug: input.dataset.parent_dataset_slug },
            include: { dataset: true },
          });
          if (!parentResource?.dataset) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Parent dataset not found.');
          }
          parentId = parentResource.dataset.id;
        }

        await tx.dataset.create({
          data: {
            resourceId: resource.id,
            version: input.dataset?.version ?? 'v1.0',
            fileFormat: input.dataset?.file_format ?? null,
            recordCount: input.dataset?.record_count ?? null,
            annotationType: input.dataset?.annotation_type ?? null,
            domain: input.dataset?.domain ?? null,
            collectionYear: input.dataset?.collection_year ?? null,
            dataSource: input.dataset?.data_source ?? null,
            methodology: input.dataset?.methodology ?? null,
            parentId,
          },
        });
      }

      if (input.type === 'paper') {
        await tx.paper.create({
          data: {
            resourceId: resource.id,
            abstract: input.paper?.abstract ?? null,
            authors: input.paper?.authors ?? [],
            venue: input.paper?.venue ?? null,
            year: input.paper?.year ?? null,
            doi: input.paper?.doi ?? null,
            arxivId: input.paper?.arxiv_id ?? null,
            pdfUrl: input.paper?.pdf_url ?? null,
            codeUrl: input.paper?.code_url ?? null,
          },
        });
      }

      if (input.type === 'tool') {
        await tx.tool.create({
          data: {
            resourceId: resource.id,
            toolType: input.tool?.tool_type ?? null,
            platform: input.tool?.platform ?? null,
            demoUrl: input.tool?.demo_url ?? null,
            installCommand: input.tool?.install_command ?? null,
          },
        });
      }

      if (input.tags && input.tags.length > 0) {
        await linkTags(tx, resource.id, input.tags);
      }

      return resource;
    });

    await writeAuditLog({
      actorId: authorId,
      action: 'resource.create',
      targetType: 'resource',
      targetId: created.id,
      newValue: { slug: created.slug, type: created.type },
    });

    void this.syncSearchIndex(created.id);

    return {
      id: created.id,
      slug: created.slug,
      status: created.status,
      message: 'Your submission is under review. We will notify you within 48 hours.',
    };
  }

  static async update(
    slug: string,
    requester: AccessTokenPayload,
    input: UpdateResourceInput,
  ): Promise<unknown> {
    const resource = await prisma.resource.findUnique({ where: { slug } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await assertCanModify(resource, requester, 'edit');

    const oldValue = {
      title: resource.title,
      description: resource.description,
      categoryId: resource.categoryId,
    };

    await prisma.$transaction(async (tx) => {
      await tx.resource.update({
        where: { id: resource.id },
        data: {
          title: input.title,
          description: input.description,
          categoryId: input.category_id,
          language: input.language,
          license: input.license,
          externalUrl: input.external_url,
          thumbnailUrl: input.thumbnail_url,
        },
      });

      if (input.dataset && resource.type === 'dataset') {
        await tx.dataset.update({
          where: { resourceId: resource.id },
          data: {
            version: input.dataset.version,
            fileFormat: input.dataset.file_format,
            recordCount: input.dataset.record_count,
            annotationType: input.dataset.annotation_type,
            domain: input.dataset.domain,
            collectionYear: input.dataset.collection_year,
            dataSource: input.dataset.data_source,
            methodology: input.dataset.methodology,
          },
        });
      }

      if (input.tags) {
        await tx.resourceTag.deleteMany({ where: { resourceId: resource.id } });
        await linkTags(tx, resource.id, input.tags);
      }
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'resource.update',
      targetType: 'resource',
      targetId: resource.id,
      oldValue,
      newValue: {
        title: input.title,
        description: input.description,
        categoryId: input.category_id,
      },
    });

    void this.syncSearchIndex(resource.id);

    return toResourceDto(await this.getResourceWithRelations(resource.id));
  }

  static async softDelete(slug: string, requester: AccessTokenPayload): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { slug } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await assertCanModify(resource, requester, 'delete');

    await prisma.resource.update({ where: { id: resource.id }, data: { deletedAt: new Date() } });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'resource.delete',
      targetType: 'resource',
      targetId: resource.id,
      oldValue: { deletedAt: null },
      newValue: { deletedAt: new Date().toISOString() },
    });

    // syncSearchIndex re-fetches the (now soft-deleted) resource and correctly
    // removes it from the index, since indexResource() checks deletedAt itself.
    void this.syncSearchIndex(resource.id);
  }

  static async approve(resourceId: string, approverId: string): Promise<unknown> {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        publishedAt: resource.publishedAt ?? new Date(),
      },
    });

    await writeAuditLog({
      actorId: approverId,
      action: 'resource.approve',
      targetType: 'resource',
      targetId: resourceId,
      oldValue: { status: resource.status },
      newValue: { status: 'approved' },
    });

    if (resource.authorId) {
      const points = RESOURCE_APPROVAL_POINTS[resource.type];
      if (points) {
        await ReputationService.award({
          userId: resource.authorId,
          eventType: `${resource.type}_approved`,
          points,
          resourceId: resource.id,
          description: `"${resource.title}" was approved`,
        });
      }
    }

    await this.notifySubmissionDecision(resource, 'approved');

    void this.syncSearchIndex(resourceId);

    return toResourceDto(await this.getResourceWithRelations(resourceId));
  }

  static async reject(resourceId: string, approverId: string, reason?: string): Promise<unknown> {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await prisma.resource.update({ where: { id: resourceId }, data: { status: 'rejected' } });

    await writeAuditLog({
      actorId: approverId,
      action: 'resource.reject',
      targetType: 'resource',
      targetId: resourceId,
      oldValue: { status: resource.status },
      newValue: { status: 'rejected', reason: reason ?? null },
    });

    if (resource.authorId) {
      await ReputationService.award({
        userId: resource.authorId,
        eventType: 'submission_rejected',
        points: SUBMISSION_REJECTED_POINTS,
        resourceId: resource.id,
        description: `"${resource.title}" was rejected`,
      });
    }

    await this.notifySubmissionDecision(resource, 'rejected', reason);

    void this.syncSearchIndex(resourceId);

    return toResourceDto(await this.getResourceWithRelations(resourceId));
  }

  // Shared by approve()/reject() — fetches the author once, creates the
  // matching notification (doc 10's `submission_approved`/`submission_rejected`
  // types), and fires the matching email. Mirrors the exact
  // NotificationService.create() (awaited) + `void EmailService...()`
  // (fire-and-forget) pattern already established in
  // contributor-application.service.ts.
  private static async notifySubmissionDecision(
    resource: { id: string; slug: string; title: string; type: string; authorId: string | null },
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<void> {
    if (!resource.authorId) return;

    const author = await prisma.user.findUnique({
      where: { id: resource.authorId },
      select: { email: true, displayName: true, username: true },
    });
    if (!author) return;

    const userName = author.displayName ?? author.username;

    await NotificationService.create({
      userId: resource.authorId,
      type: decision === 'approved' ? 'submission_approved' : 'submission_rejected',
      title: decision === 'approved' ? 'Your submission was approved' : 'Your submission was not approved',
      message:
        decision === 'approved'
          ? `"${resource.title}" is now live on Bangla AI Hub.`
          : `"${resource.title}" was not approved.${reason ? ` ${reason}` : ''}`,
      link: resourceLink(resource.type, resource.slug),
    });

    if (decision === 'approved') {
      void EmailService.sendSubmissionApproved(author.email, userName, resource.title, resource.slug);
    } else {
      void EmailService.sendSubmissionRejected(author.email, userName, resource.title, reason);
    }
  }

  static async setFeatured(resourceId: string, featured: boolean, actorId: string): Promise<unknown> {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await prisma.resource.update({ where: { id: resourceId }, data: { featured } });

    await writeAuditLog({
      actorId,
      action: featured ? 'admin.resource.feature' : 'admin.resource.unfeature',
      targetType: 'resource',
      targetId: resourceId,
      oldValue: { featured: resource.featured },
      newValue: { featured },
    });

    void this.syncSearchIndex(resourceId);

    return toResourceDto(await this.getResourceWithRelations(resourceId));
  }

  static async restore(resourceId: string, actorId: string): Promise<unknown> {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
    if (!resource.deletedAt) {
      throw new ApiError(409, 'CONFLICT', 'Resource is not deleted.');
    }

    await prisma.resource.update({ where: { id: resourceId }, data: { deletedAt: null } });

    await writeAuditLog({
      actorId,
      action: 'admin.resource.restore',
      targetType: 'resource',
      targetId: resourceId,
      oldValue: { deletedAt: resource.deletedAt.toISOString() },
      newValue: { deletedAt: null },
    });

    void this.syncSearchIndex(resourceId);

    return toResourceDto(await this.getResourceWithRelations(resourceId));
  }

  static async uploadFile(
    slug: string,
    requester: AccessTokenPayload,
    file: UploadedFile,
    kind: UploadKind = 'dataset',
  ): Promise<{ file_url: string }> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      include: { dataset: true, paper: true, tool: true },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    if (resource.authorId !== requester.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the resource author can upload its file.');
    }

    let key: string;

    switch (kind) {
      case 'dataset': {
        if (resource.type !== 'dataset' || !resource.dataset) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'Only dataset resources support dataset file uploads.');
        }
        const previousKey = resource.dataset.fileUrl;
        const uploaded = await StorageService.uploadDatasetFile(resource.id, file);
        key = uploaded.key;
        await prisma.dataset.update({
          where: { resourceId: resource.id },
          data: { fileUrl: key, fileSizeBytes: BigInt(file.size), checksumSha256: uploaded.checksum },
        });
        await StorageService.deleteObject(previousKey).catch(() => {});
        break;
      }
      case 'thumbnail': {
        const previousKey = objectKeyOrNull(resource.thumbnailUrl);
        const uploaded = await StorageService.uploadThumbnail(resource.id, file);
        key = uploaded.key;
        await prisma.resource.update({ where: { id: resource.id }, data: { thumbnailUrl: key } });
        await StorageService.deleteObject(previousKey).catch(() => {});
        break;
      }
      case 'pdf': {
        if (resource.type !== 'paper' || !resource.paper) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'Only paper resources support PDF uploads.');
        }
        const previousKey = objectKeyOrNull(resource.paper.pdfUrl);
        const uploaded = await StorageService.uploadPaperPdf(resource.id, file);
        key = uploaded.key;
        await prisma.paper.update({ where: { resourceId: resource.id }, data: { pdfUrl: key } });
        await StorageService.deleteObject(previousKey).catch(() => {});
        break;
      }
      case 'asset': {
        if (resource.type !== 'tool' || !resource.tool) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'Only tool resources support asset uploads.');
        }
        const previousKey = resource.tool.fileUrl;
        const uploaded = await StorageService.uploadToolAsset(resource.id, file);
        key = uploaded.key;
        await prisma.tool.update({
          where: { resourceId: resource.id },
          data: { fileUrl: key, fileSizeBytes: BigInt(file.size), checksumSha256: uploaded.checksum },
        });
        await StorageService.deleteObject(previousKey).catch(() => {});
        break;
      }
      case 'documentation': {
        const previousKey = objectKeyOrNull(resource.documentationUrl);
        const uploaded = await StorageService.uploadDocumentation(resource.id, file);
        key = uploaded.key;
        await prisma.resource.update({ where: { id: resource.id }, data: { documentationUrl: key } });
        await StorageService.deleteObject(previousKey).catch(() => {});
        break;
      }
    }

    const fileUrl = await StorageService.getSignedDownloadUrl(key);

    await writeAuditLog({
      actorId: requester.userId,
      action: 'resource.upload_file',
      targetType: 'resource',
      targetId: resource.id,
      newValue: { key, size: file.size, kind },
    });

    void this.syncSearchIndex(resource.id);

    return { file_url: fileUrl };
  }

  // --- Categories -----------------------------------------------------------

  static async listCategories(): Promise<unknown[]> {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const byId = new Map<number, Record<string, unknown> & { children: unknown[] }>(
      categories.map((category) => [category.id, { ...toCategoryDto(category), children: [] }]),
    );
    const roots: unknown[] = [];

    for (const category of categories) {
      const node = byId.get(category.id);
      if (!node) continue;

      if (category.parentId !== null && byId.has(category.parentId)) {
        byId.get(category.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  static async getCategoryBySlug(slug: string): Promise<unknown> {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Category not found.');
    }
    return toCategoryDto(category);
  }

  static async listCategoryResources(
    slug: string,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Category not found.');
    }

    const where: Prisma.ResourceWhereInput = {
      categoryId: category.id,
      status: 'approved',
      deletedAt: null,
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

  static async createCategory(input: CreateCategoryInput, actorId: string): Promise<unknown> {
    const baseSlug = slugify(input.slug ?? input.name);
    const slug = await ensureUniqueSlug(baseSlug, async (candidate) => {
      const existing = await prisma.category.findUnique({ where: { slug: candidate } });
      return existing !== null;
    });

    if (input.parent_id) {
      const parent = await prisma.category.findUnique({ where: { id: input.parent_id } });
      if (!parent) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Parent category not found.');
      }
    }

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        parentId: input.parent_id ?? null,
        icon: input.icon ?? null,
        sortOrder: input.sort_order ?? 0,
      },
    });

    await writeAuditLog({
      actorId,
      action: 'category.create',
      targetType: 'category',
      targetId: String(category.id),
      newValue: { name: category.name, slug: category.slug },
    });

    return toCategoryDto(category);
  }

  static async updateCategory(
    id: number,
    input: UpdateCategoryInput,
    actorId: string,
  ): Promise<unknown> {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Category not found.');
    }

    if (input.parent_id !== undefined && input.parent_id !== null) {
      if (input.parent_id === id) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'A category cannot be its own parent.');
      }
      if (await wouldCreateCycle(id, input.parent_id)) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'This would create a circular category hierarchy.',
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug ? slugify(input.slug) : undefined,
        description: input.description,
        parentId: input.parent_id,
        icon: input.icon,
        sortOrder: input.sort_order,
      },
    });

    await writeAuditLog({
      actorId,
      action: 'category.update',
      targetType: 'category',
      targetId: String(id),
      oldValue: { name: category.name, parentId: category.parentId },
      newValue: { name: updated.name, parentId: updated.parentId },
    });

    return toCategoryDto(updated);
  }

  static async deleteCategory(id: number, actorId: string): Promise<void> {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Category not found.');
    }

    const [resourceCount, childCount] = await Promise.all([
      prisma.resource.count({ where: { categoryId: id, deletedAt: null } }),
      prisma.category.count({ where: { parentId: id } }),
    ]);

    if (resourceCount > 0 || childCount > 0) {
      throw new ApiError(
        409,
        'CONFLICT',
        'Cannot delete a category that still has resources or subcategories.',
      );
    }

    await prisma.category.delete({ where: { id } });

    await writeAuditLog({
      actorId,
      action: 'category.delete',
      targetType: 'category',
      targetId: String(id),
      oldValue: { name: category.name },
    });
  }

  // --- Tags -------------------------------------------------------------------

  static async listTags(limit = 20): Promise<unknown[]> {
    const tags = await prisma.tag.findMany({ orderBy: { usageCount: 'desc' }, take: limit });
    return tags.map(toTagDto);
  }

  static async searchTags(query: string): Promise<unknown[]> {
    if (!query.trim()) return [];

    const tags = await prisma.tag.findMany({
      where: { name: { contains: query.trim().toLowerCase(), mode: 'insensitive' } },
      orderBy: { usageCount: 'desc' },
      take: 20,
    });
    return tags.map(toTagDto);
  }

  static async listTagResources(
    slug: string,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const tag = await prisma.tag.findUnique({ where: { slug } });
    if (!tag) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Tag not found.');
    }

    const where: Prisma.ResourceWhereInput = {
      status: 'approved',
      deletedAt: null,
      resourceTags: { some: { tagId: tag.id } },
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
}
