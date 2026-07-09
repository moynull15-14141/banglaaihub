import path from 'node:path';
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
  ReorderResourceAttachmentsInput,
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
  model: true,
  prompt: true,
  files: { orderBy: { sortOrder: 'asc' } },
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
  model: 40,
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
    case 'model':
      return `/models/${slug}`;
    case 'prompt':
      return `/prompts/${slug}`;
    default:
      return `/resources/${slug}`;
  }
}

export type UploadKind = 'dataset' | 'thumbnail' | 'pdf' | 'asset' | 'documentation' | 'model';

// thumbnail_url/documentation_url/paper.pdf_url can each be either a
// user-pasted external URL or a previously-uploaded R2 key (see
// StorageService.resolveUrl) — only delete-on-replace when the previous
// value was actually ours to delete, never when it was just a link someone
// typed in.
function objectKeyOrNull(value: string | null): string | null {
  if (!value || /^https?:\/\//i.test(value)) return null;
  return value;
}

// ResourceFile row -> API shape. Always a signed URL (never the raw storage
// key), same discipline as every other file field on this resource.
async function toResourceFileDto(file: ResourceWithRelations['files'][number]): Promise<Record<string, unknown>> {
  return {
    id: file.id,
    filename: file.filename,
    display_name: file.displayName,
    mime_type: file.mimeType,
    extension: file.extension,
    size_bytes: file.sizeBytes.toString(),
    checksum_sha256: file.checksumSha256,
    sort_order: file.sortOrder,
    uploaded_by: file.uploadedBy,
    uploaded_at: file.uploadedAt,
    url: await StorageService.getSignedDownloadUrl(file.storageKey),
  };
}

// Async because thumbnail_url/documentation_url/dataset.file_url/
// paper.pdf_url/tool.file_url may each be either a plain external URL
// (passed through unchanged, the pre-existing behavior) or an R2 object key
// (resolved to a short-lived signed URL, exactly like avatars already do via
// StorageService.resolveUrl) — the raw key itself is never returned.
export async function toResourceDto(resource: ResourceWithRelations): Promise<Record<string, unknown>> {
  const [thumbnailUrl, documentationUrl, datasetFileUrl, paperPdfUrl, toolFileUrl, modelFileUrl, attachments] =
    await Promise.all([
      StorageService.resolveUrl(resource.thumbnailUrl),
      StorageService.resolveUrl(resource.documentationUrl),
      resource.dataset ? StorageService.resolveUrl(resource.dataset.fileUrl) : null,
      resource.paper ? StorageService.resolveUrl(resource.paper.pdfUrl) : null,
      resource.tool ? StorageService.resolveUrl(resource.tool.fileUrl) : null,
      resource.model ? StorageService.resolveUrl(resource.model.fileUrl) : null,
      Promise.all(resource.files.map(toResourceFileDto)),
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
    attachments,
    attachment_count: resource.files.length,
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
    deleted_at: resource.deletedAt,
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
    model: resource.model
      ? {
          architecture: resource.model.architecture,
          base_model: resource.model.baseModel,
          format: resource.model.format,
          quantization: resource.model.quantization,
          context_length: resource.model.contextLength,
          parameters: resource.model.parameters,
          precision: resource.model.precision,
          gpu_requirement: resource.model.gpuRequirement,
          ram_requirement: resource.model.ramRequirement,
          benchmark_score: resource.model.benchmarkScore,
          inference_example: resource.model.inferenceExample,
          version: resource.model.version,
          changelog: resource.model.changelog,
          demo_url: resource.model.demoUrl,
          repository_url: resource.model.repositoryUrl,
          paper_url: resource.model.paperUrl,
          file_url: modelFileUrl,
          file_size_bytes: resource.model.fileSizeBytes?.toString() ?? null,
          checksum_sha256: resource.model.checksumSha256,
          parent_id: resource.model.parentId,
        }
      : null,
    prompt: resource.prompt
      ? {
          role: resource.prompt.role,
          content: resource.prompt.content,
          target_platforms: resource.prompt.targetPlatforms,
          variables: resource.prompt.variables,
          difficulty: resource.prompt.difficulty,
          example_output: resource.prompt.exampleOutput,
          version: resource.prompt.version,
          parent_id: resource.prompt.parentId,
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

// Batched to a fixed ~4 round trips regardless of tag count — the previous
// per-tag upsert loop (2 sequential round trips per tag) could exceed
// Prisma's 5s interactive-transaction timeout against the remote Supabase
// pooler once a submission had several tags.
async function linkTags(
  tx: Prisma.TransactionClient,
  resourceId: string,
  tagNames: string[],
): Promise<void> {
  const names = Array.from(new Set(tagNames.map((raw) => raw.trim().toLowerCase()).filter(Boolean)));
  if (names.length === 0) return;

  await tx.tag.createMany({
    data: names.map((name) => ({ name, slug: slugify(name), usageCount: 0 })),
    skipDuplicates: true,
  });

  await tx.tag.updateMany({
    where: { name: { in: names } },
    data: { usageCount: { increment: 1 } },
  });

  const tags = await tx.tag.findMany({ where: { name: { in: names } }, select: { id: true } });

  await tx.resourceTag.createMany({
    data: tags.map((tag) => ({ resourceId, tagId: tag.id })),
    skipDuplicates: true,
  });
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
    let canModerate = false;
    let canRestoreDeleted = false;
    if (requester) {
      const permissions = await AuthService.getUserPermissions(requester.userId);
      canModerate = MODERATION_PERMISSIONS.some((permission) => permissions.has(permission));
      // Same permission the restore endpoint itself requires (resource:edit_any,
      // see POST /admin/resources/:id/restore) — gating the listing any
      // stricter would let a role restore a resource it can never find.
      canRestoreDeleted = permissions.has('resource:edit_any');
    }

    // `deleted=true` requires the same permission as restoring — surfaces
    // soft-deleted resources so there's something for the restore action to
    // find, instead of them just vanishing from every list once deleted.
    const where: Prisma.ResourceWhereInput =
      query.deleted && canRestoreDeleted ? { deletedAt: { not: null } } : { deletedAt: null };

    if (query.type) where.type = query.type;
    if (query.language) where.language = query.language;
    if (query.category) where.category = { slug: query.category };
    if (query.featured) where.featured = true;

    where.status = query.status && canModerate ? query.status : 'approved';
    // Public browsing/search only ever shows `public` resources — `private`
    // and `unlisted` are reachable by direct slug (assertCanView allows
    // unlisted through) but never appear in a list. Moderators see
    // everything, since they need to be able to find/review private
    // submissions too.
    if (!canModerate) where.visibility = 'public';

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

  // Shared by getBySlug()/getDownloadUrl() — a non-approved resource, or a
  // `private` one regardless of status, is only visible to its own author or
  // someone with a moderation permission. `unlisted` is intentionally NOT
  // checked here — per Part 8, "anyone with the URL" can view it; it's only
  // excluded from list()'s public browsing/search results. 404 (never 403)
  // in every denied case, so a private/pending resource's existence is never
  // leaked to someone who shouldn't see it.
  private static async assertCanView(
    resource: { authorId: string | null; status: string; visibility: string },
    requester?: AccessTokenPayload,
  ): Promise<void> {
    const isOwner = requester?.userId === resource.authorId;
    let canModerate = false;
    if (requester) {
      const permissions = await AuthService.getUserPermissions(requester.userId);
      canModerate = MODERATION_PERMISSIONS.some((permission) => permissions.has(permission));
    }
    if (isOwner || canModerate) return;

    if (resource.status !== 'approved' || resource.visibility === 'private') {
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

    const dto = await toResourceDto(resource);
    // Merged in separately (never a param on toResourceDto itself) — several
    // call sites pass that function directly to Array.map, where a second
    // parameter would silently receive the array index instead of a real
    // argument. Only the single-resource detail view needs this, so it's
    // resolved here instead.
    if (requester) {
      const bookmark = await prisma.bookmark.findUnique({
        where: { userId_resourceId: { userId: requester.userId, resourceId: resource.id } },
        select: { id: true },
      });
      dto.is_bookmarked = bookmark !== null;
    }

    return dto;
  }

  // GET /resources/:slug/download?file_id= — resolves either a specific
  // ResourceFile attachment (file_id given) or the resource's legacy primary
  // file (file_id omitted: dataset.file_url / tool.file_url / paper.pdf_url).
  // Never returns the raw R2 key — always a signed URL (or the external URL
  // unchanged, if that's what's stored). Deliberately does NOT record
  // analytics/download_count — this only issues the URL; confirmDownload()
  // below is what counts as "a successful download" (Part 5).
  static async getDownloadUrl(
    slug: string,
    requester: AccessTokenPayload | undefined,
    fileId?: string,
  ): Promise<{ url: string; filename: string; size_bytes: string | null }> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      include: { dataset: true, paper: true, tool: true, model: true, files: true },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await this.assertCanView(resource, requester);

    if (fileId) {
      const file = resource.files.find((f) => f.id === fileId);
      if (!file) {
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Attachment not found.');
      }
      const url = await StorageService.getSignedDownloadUrl(file.storageKey, undefined, file.filename);
      return { url, filename: file.filename, size_bytes: file.sizeBytes.toString() };
    }

    const key =
      resource.type === 'dataset'
        ? (resource.dataset?.fileUrl ?? null)
        : resource.type === 'tool'
          ? (resource.tool?.fileUrl ?? null)
          : resource.type === 'paper'
            ? (resource.paper?.pdfUrl ?? null)
            : resource.type === 'model'
              ? (resource.model?.fileUrl ?? null)
              : null;

    if (!key) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'This resource has no downloadable file.');
    }

    const sizeBytes =
      resource.type === 'dataset'
        ? (resource.dataset?.fileSizeBytes?.toString() ?? null)
        : resource.type === 'tool'
          ? (resource.tool?.fileSizeBytes?.toString() ?? null)
          : resource.type === 'model'
            ? (resource.model?.fileSizeBytes?.toString() ?? null)
            : null;
    // Legacy single-slot fields never stored the original filename — best
    // effort synthesis from the resource's own slug + the key's real
    // extension (the key always ends in it, see StorageService.uploadObject).
    const isExternal = /^https?:\/\//i.test(key);
    const filename = isExternal ? resource.slug : `${resource.slug}${path.extname(key)}`;
    const url = isExternal ? key : await StorageService.getSignedDownloadUrl(key, undefined, filename);

    return { url, filename, size_bytes: sizeBytes };
  }

  // POST /resources/:slug/download/confirm?file_id= — called by the client
  // once it has actually obtained the signed URL from getDownloadUrl() above
  // and handed it to the browser. This is the "successful download" event
  // per Part 5, not the URL-issuing GET.
  static async confirmDownload(
    slug: string,
    requester: AccessTokenPayload | undefined,
    fileId?: string,
  ): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { slug } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    // Same visibility check as getDownloadUrl() — without it, anyone who
    // knows (or guesses) a private/pending resource's slug could inflate its
    // download_count and analytics via this endpoint alone, without ever
    // having been authorized to obtain a download URL for it.
    await this.assertCanView(resource, requester);

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
      data: {
        resourceId: resource.id,
        eventType: 'download',
        userId: requester?.userId ?? null,
      },
    });

    await writeAuditLog({
      actorId: requester?.userId ?? null,
      action: 'resource.download',
      targetType: 'resource',
      targetId: resource.id,
      newValue: fileId ? { file_id: fileId } : undefined,
    });
  }

  // POST /resources/:slug/share — logs a ResourceAnalytics 'share' event.
  // There's no dedicated share_count column (doc 10 only defines view/
  // download/bookmark counters on the base Resource); the analytics event
  // count itself is the share count, read on demand rather than duplicated
  // into a second, cache-able-to-drift counter.
  static async logShare(slug: string, requester?: AccessTokenPayload): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { slug } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
    // Same reasoning as confirmDownload() — without this, the share count
    // could be inflated for a private/pending resource by anyone who knows
    // its slug, without ever having been authorized to view it.
    await this.assertCanView(resource, requester);

    await prisma.resourceAnalytics.create({
      data: { resourceId: resource.id, eventType: 'share', userId: requester?.userId ?? null },
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

      if (input.type === 'model') {
        let parentId: string | null = null;

        if (input.model?.parent_model_slug) {
          const parentResource = await tx.resource.findUnique({
            where: { slug: input.model.parent_model_slug },
            include: { model: true },
          });
          if (!parentResource?.model) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Parent model not found.');
          }
          parentId = parentResource.model.id;
        }

        await tx.model.create({
          data: {
            resourceId: resource.id,
            architecture: input.model?.architecture ?? null,
            baseModel: input.model?.base_model ?? null,
            format: input.model?.format ?? null,
            quantization: input.model?.quantization ?? null,
            contextLength: input.model?.context_length ?? null,
            parameters: input.model?.parameters ?? null,
            precision: input.model?.precision ?? null,
            gpuRequirement: input.model?.gpu_requirement ?? null,
            ramRequirement: input.model?.ram_requirement ?? null,
            benchmarkScore: (input.model?.benchmark_score as Prisma.InputJsonValue | undefined) ?? undefined,
            inferenceExample: input.model?.inference_example ?? null,
            version: input.model?.version ?? 'v1.0',
            changelog: input.model?.changelog ?? null,
            demoUrl: input.model?.demo_url ?? null,
            repositoryUrl: input.model?.repository_url ?? null,
            paperUrl: input.model?.paper_url ?? null,
            parentId,
          },
        });
      }

      if (input.type === 'prompt') {
        let parentId: string | null = null;

        if (input.prompt?.parent_prompt_slug) {
          const parentResource = await tx.resource.findUnique({
            where: { slug: input.prompt.parent_prompt_slug },
            include: { prompt: true },
          });
          if (!parentResource?.prompt) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Parent prompt not found.');
          }
          parentId = parentResource.prompt.id;
        }

        await tx.prompt.create({
          data: {
            resourceId: resource.id,
            role: input.prompt?.role ?? 'user',
            content: input.prompt?.content ?? '',
            targetPlatforms: input.prompt?.target_platforms ?? [],
            variables: input.prompt?.variables ?? undefined,
            difficulty: input.prompt?.difficulty ?? null,
            exampleOutput: input.prompt?.example_output ?? null,
            version: input.prompt?.version ?? 'v1.0',
            parentId,
          },
        });
      }

      if (input.tags && input.tags.length > 0) {
        await linkTags(tx, resource.id, input.tags);
      }

      return resource;
    }, { timeout: 15000 });

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

    // Editing an approved resource sends it back to moderation — but only
    // when the AUTHOR themselves makes the edit. A moderator/editor fixing
    // someone else's resource via resource:edit_any is a moderation action,
    // not a resubmission, and shouldn't force a re-review of their own change.
    const isOwnEdit = resource.authorId === requester.userId;
    const resubmitting = isOwnEdit && resource.status === 'approved';

    const oldValue = {
      title: resource.title,
      description: resource.description,
      categoryId: resource.categoryId,
      status: resource.status,
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
          visibility: input.visibility,
          ...(resubmitting ? { status: 'pending' as const, approvedBy: null, approvedAt: null } : {}),
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

      if (input.paper && resource.type === 'paper') {
        await tx.paper.update({
          where: { resourceId: resource.id },
          data: {
            abstract: input.paper.abstract,
            authors: input.paper.authors,
            venue: input.paper.venue,
            year: input.paper.year,
            doi: input.paper.doi,
            arxivId: input.paper.arxiv_id,
            pdfUrl: input.paper.pdf_url,
            codeUrl: input.paper.code_url,
          },
        });
      }

      if (input.tool && resource.type === 'tool') {
        await tx.tool.update({
          where: { resourceId: resource.id },
          data: {
            toolType: input.tool.tool_type,
            platform: input.tool.platform,
            demoUrl: input.tool.demo_url,
            installCommand: input.tool.install_command,
          },
        });
      }

      if (input.model && resource.type === 'model') {
        await tx.model.update({
          where: { resourceId: resource.id },
          data: {
            architecture: input.model.architecture,
            baseModel: input.model.base_model,
            format: input.model.format,
            quantization: input.model.quantization,
            contextLength: input.model.context_length,
            parameters: input.model.parameters,
            precision: input.model.precision,
            gpuRequirement: input.model.gpu_requirement,
            ramRequirement: input.model.ram_requirement,
            benchmarkScore: input.model.benchmark_score as Prisma.InputJsonValue | undefined,
            inferenceExample: input.model.inference_example,
            version: input.model.version,
            changelog: input.model.changelog,
            demoUrl: input.model.demo_url,
            repositoryUrl: input.model.repository_url,
            paperUrl: input.model.paper_url,
          },
        });
      }

      if (input.prompt && resource.type === 'prompt') {
        await tx.prompt.update({
          where: { resourceId: resource.id },
          data: {
            role: input.prompt.role,
            content: input.prompt.content,
            targetPlatforms: input.prompt.target_platforms,
            variables: input.prompt.variables,
            difficulty: input.prompt.difficulty,
            exampleOutput: input.prompt.example_output,
            version: input.prompt.version,
          },
        });
      }

      if (input.tags) {
        await tx.resourceTag.deleteMany({ where: { resourceId: resource.id } });
        await linkTags(tx, resource.id, input.tags);
      }
    }, { timeout: 15000 });

    await writeAuditLog({
      actorId: requester.userId,
      action: resubmitting ? 'resource.update_resubmit' : 'resource.update',
      targetType: 'resource',
      targetId: resource.id,
      oldValue,
      newValue: {
        title: input.title,
        description: input.description,
        categoryId: input.category_id,
        status: resubmitting ? 'pending' : resource.status,
      },
    });

    void this.syncSearchIndex(resource.id);

    return toResourceDto(await this.getResourceWithRelations(resource.id));
  }

  // Phase 3A.1 — Prompt Fork. Deliberately does NOT duplicate any of create()'s
  // slug/transaction/tag-linking/audit-log/search-sync logic: it builds a
  // CreateResourceInput copying the source prompt's fields (with
  // parent_prompt_slug set to the source) and calls this.create() directly,
  // exactly the same reuse pattern datasets already use for
  // parent_dataset_slug. Prompt-only — Model has no "fork" concept, only
  // version history (see getVersionChain below).
  static async fork(
    slug: string,
    requester: AccessTokenPayload,
  ): Promise<{ id: string; slug: string; status: string; message: string }> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      include: { prompt: true, resourceTags: { include: { tag: true } } },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
    if (resource.type !== 'prompt' || !resource.prompt) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Only prompt resources can be forked.');
    }
    if (resource.status !== 'approved') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Only approved prompts can be forked.');
    }
    await this.assertCanView(resource, requester);

    const input: CreateResourceInput = {
      title: `${resource.title} (Fork)`.slice(0, 300),
      description: resource.description ?? undefined,
      type: 'prompt',
      category_id: resource.categoryId ?? undefined,
      tags: resource.resourceTags.map((rt) => rt.tag.name),
      language: resource.language as CreateResourceInput['language'],
      license: resource.license ?? undefined,
      prompt: {
        role: resource.prompt.role,
        content: resource.prompt.content,
        target_platforms: resource.prompt.targetPlatforms,
        variables: resource.prompt.variables
          ? (resource.prompt.variables as unknown as NonNullable<CreateResourceInput['prompt']>['variables'])
          : undefined,
        difficulty: resource.prompt.difficulty ?? undefined,
        version: 'v1.0',
        parent_prompt_slug: resource.slug,
      },
    };

    const created = await this.create(requester.userId, input);

    await writeAuditLog({
      actorId: requester.userId,
      action: 'resource.fork',
      targetType: 'resource',
      targetId: created.id,
      newValue: { forkedFrom: resource.id, slug: created.slug },
    });

    return { ...created, message: 'Prompt forked successfully.' };
  }

  // Phase 3A.1 — Version History. Model/Prompt each have a shallow
  // self-referential parentId (see schema) — this walks that chain (bounded,
  // same defensive-hop-limit pattern as wouldCreateCycle above) rather than
  // introducing any new table or a branching tree browser. Read-only; no
  // merge/compare concept exists.
  static async getVersionChain(slug: string, requester?: AccessTokenPayload): Promise<unknown[]> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      include: { model: true, prompt: true },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
    await this.assertCanView(resource, requester);

    if (resource.type !== 'model' && resource.type !== 'prompt') {
      return [];
    }

    const chainRefs = await this.collectVersionChainRefs(resource);
    if (chainRefs.length <= 1) return [];

    const resources = await prisma.resource.findMany({
      where: { id: { in: chainRefs.map((ref) => ref.resourceId) }, deletedAt: null },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        model: { select: { version: true } },
        prompt: { select: { version: true } },
      },
    });
    const byId = new Map(resources.map((r) => [r.id, r]));

    let canModerate = false;
    if (requester) {
      const permissions = await AuthService.getUserPermissions(requester.userId);
      canModerate = MODERATION_PERMISSIONS.some((permission) => permissions.has(permission));
    }

    // Pending/private entries in the chain are silently dropped (not just for
    // the current resource — assertCanView above only guards that one) unless
    // the requester owns them or can moderate, per Part 7: "pending resources
    // must never appear publicly."
    const visible = chainRefs
      .map((ref) => byId.get(ref.resourceId))
      .filter((r): r is NonNullable<typeof r> => {
        if (!r) return false;
        const isOwner = requester?.userId === r.authorId;
        if (isOwner || canModerate) return true;
        return r.status === 'approved' && r.visibility === 'public';
      });

    if (visible.length <= 1) return [];

    return visible.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      type: r.type,
      version: r.model?.version ?? r.prompt?.version ?? null,
      author: r.author ? { username: r.author.username, display_name: r.author.displayName } : null,
      status: r.status,
      published_at: r.publishedAt,
      is_current: r.id === resource.id,
    }));
  }

  // Walks up to the chain's root via parentId, then back down following the
  // earliest-created child at each level — a single deterministic path, never
  // a full tree (Part 2/3: "only browsing," no merge/compare). Bounded to 25
  // hops each direction; a real chain will never approach that depth.
  private static async collectVersionChainRefs(resource: {
    id: string;
    type: string;
    model: { id: string; parentId: string | null } | null;
    prompt: { id: string; parentId: string | null } | null;
  }): Promise<{ typeRowId: string; resourceId: string }[]> {
    const isModel = resource.type === 'model';
    const startRow = isModel ? resource.model : resource.prompt;
    if (!startRow) return [];

    const MAX_HOPS = 25;
    type ChainRow = { id: string; parentId: string | null; resourceId: string };

    const ancestors: ChainRow[] = [];
    let currentParentId = startRow.parentId;
    let hops = 0;
    while (currentParentId && hops < MAX_HOPS) {
      const parentRow = isModel
        ? await prisma.model.findUnique({
            where: { id: currentParentId },
            select: { id: true, parentId: true, resourceId: true },
          })
        : await prisma.prompt.findUnique({
            where: { id: currentParentId },
            select: { id: true, parentId: true, resourceId: true },
          });
      if (!parentRow) break;
      ancestors.push(parentRow);
      currentParentId = parentRow.parentId;
      hops += 1;
    }
    ancestors.reverse();

    const descendants: { id: string; resourceId: string }[] = [];
    let currentId = startRow.id;
    hops = 0;
    while (hops < MAX_HOPS) {
      const child = isModel
        ? await prisma.model.findFirst({
            where: { parentId: currentId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, resourceId: true },
          })
        : await prisma.prompt.findFirst({
            where: { parentId: currentId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, resourceId: true },
          });
      if (!child) break;
      descendants.push(child);
      currentId = child.id;
      hops += 1;
    }

    return [
      ...ancestors.map((a) => ({ typeRowId: a.id, resourceId: a.resourceId })),
      { typeRowId: startRow.id, resourceId: resource.id },
      ...descendants.map((d) => ({ typeRowId: d.id, resourceId: d.resourceId })),
    ];
  }

  // Delete policy (Part 7): pending/rejected are hard-deleted immediately
  // (nothing worth keeping a moderation trail for); approved resources are
  // soft-deleted (deletedAt, restorable) since they were public and may need
  // to come back. `force=true` lets an admin (resource:delete_any) hard-delete
  // even an approved resource — the one case that bypasses the status rule.
  static async deleteResource(
    slug: string,
    requester: AccessTokenPayload,
    options: { force?: boolean } = {},
  ): Promise<void> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      include: { dataset: true, paper: true, tool: true, model: true, files: true },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const permissions = await AuthService.getUserPermissions(requester.userId);
    const isOwner = resource.authorId === requester.userId;
    const canDeleteAny = permissions.has('resource:delete_any');

    if (!canDeleteAny && !(isOwner && permissions.has('resource:delete_own'))) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to delete this resource.');
    }

    const hardDelete =
      options.force === true ? canDeleteAny : resource.status === 'pending' || resource.status === 'rejected';

    if (hardDelete) {
      const keys: (string | null)[] = [
        objectKeyOrNull(resource.thumbnailUrl),
        objectKeyOrNull(resource.documentationUrl),
        resource.dataset?.fileUrl ?? null,
        objectKeyOrNull(resource.paper?.pdfUrl ?? null),
        resource.tool?.fileUrl ?? null,
        resource.model?.fileUrl ?? null,
        ...resource.files.map((file) => file.storageKey),
      ];

      // DB-level FK actions handle the rest: Dataset/Paper/Tool/Model/Prompt/
      // ResourceFile/ResourceTag/Bookmark/Comment are all ON DELETE CASCADE
      // (removed with the resource); Report.resource_id and
      // ReputationEvent.resource_id are ON DELETE SET NULL (that history is
      // preserved, just unlinked).
      await prisma.resource.delete({ where: { id: resource.id } });

      await Promise.all(keys.map((key) => StorageService.deleteObject(key).catch(() => {})));

      await writeAuditLog({
        actorId: requester.userId,
        action: 'resource.delete_hard',
        targetType: 'resource',
        targetId: resource.id,
        oldValue: { status: resource.status, slug: resource.slug, title: resource.title },
      });

      await SearchService.deleteResource(resource.id).catch((error: unknown) => {
        logger.warn('Search index cleanup failed after hard delete', {
          resourceId: resource.id,
          error: error instanceof Error ? error.message : error,
        });
      });
      return;
    }

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
      include: { dataset: true, paper: true, tool: true, model: true },
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
      case 'model': {
        if (resource.type !== 'model' || !resource.model) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'Only model resources support model file uploads.');
        }
        const previousKey = resource.model.fileUrl;
        const uploaded = await StorageService.uploadModelFile(resource.id, file);
        key = uploaded.key;
        await prisma.model.update({
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

  // --- Multi-file attachments (ResourceFile) ---------------------------------
  // Additive on top of uploadFile()/the single-slot fields above — a separate,
  // parallel capability for every resource type (including tutorial/prompt/
  // project/news, which have no single-slot field at all), not a replacement.

  static async addAttachment(
    slug: string,
    requester: AccessTokenPayload,
    file: UploadedFile,
    displayName?: string,
  ): Promise<Record<string, unknown>> {
    const resource = await prisma.resource.findUnique({ where: { slug } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await assertCanModify(resource, requester, 'edit');

    const uploaded = await StorageService.uploadResourceAttachment(resource.type, resource.id, file);

    const maxSortOrder = await prisma.resourceFile.aggregate({
      where: { resourceId: resource.id },
      _max: { sortOrder: true },
    });

    const created = await prisma.resourceFile.create({
      data: {
        resourceId: resource.id,
        storageKey: uploaded.key,
        displayName: displayName?.trim() || uploaded.filename,
        filename: uploaded.filename,
        mimeType: uploaded.mime,
        extension: uploaded.extension,
        sizeBytes: BigInt(uploaded.size),
        checksumSha256: uploaded.checksum,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
        uploadedBy: requester.userId,
      },
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'resource.attachment.add',
      targetType: 'resource',
      targetId: resource.id,
      newValue: { fileId: created.id, filename: created.filename, size: uploaded.size },
    });

    void this.syncSearchIndex(resource.id);

    return toResourceFileDto(created);
  }

  static async deleteAttachment(slug: string, requester: AccessTokenPayload, fileId: string): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { slug } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await assertCanModify(resource, requester, 'edit');

    const file = await prisma.resourceFile.findUnique({ where: { id: fileId } });
    if (!file || file.resourceId !== resource.id) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Attachment not found.');
    }

    await prisma.resourceFile.delete({ where: { id: fileId } });
    await StorageService.deleteObject(file.storageKey).catch(() => {});

    await writeAuditLog({
      actorId: requester.userId,
      action: 'resource.attachment.delete',
      targetType: 'resource',
      targetId: resource.id,
      oldValue: { fileId: file.id, filename: file.filename },
    });

    void this.syncSearchIndex(resource.id);
  }

  // Delete-then-add in one call, so the UI can offer a single "Replace" action
  // instead of two separate steps — reuses addAttachment/deleteAttachment
  // rather than duplicating either.
  static async replaceAttachment(
    slug: string,
    requester: AccessTokenPayload,
    fileId: string,
    file: UploadedFile,
  ): Promise<Record<string, unknown>> {
    const resource = await prisma.resource.findUnique({ where: { slug } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const existing = await prisma.resourceFile.findUnique({ where: { id: fileId } });
    if (!existing || existing.resourceId !== resource.id) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Attachment not found.');
    }

    const replacement = await this.addAttachment(slug, requester, file, existing.displayName);
    await this.deleteAttachment(slug, requester, fileId);

    return replacement;
  }

  static async reorderAttachments(
    slug: string,
    requester: AccessTokenPayload,
    input: ReorderResourceAttachmentsInput,
  ): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { slug } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await assertCanModify(resource, requester, 'edit');

    const files = await prisma.resourceFile.findMany({ where: { resourceId: resource.id } });
    const ownedIds = new Set(files.map((file) => file.id));
    const invalid = input.file_ids.filter((id) => !ownedIds.has(id));
    if (invalid.length > 0 || input.file_ids.length !== files.length) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'file_ids must be exactly the resource’s current attachment IDs.');
    }

    await prisma.$transaction(
      input.file_ids.map((id, index) =>
        prisma.resourceFile.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    await writeAuditLog({
      actorId: requester.userId,
      action: 'resource.attachment.reorder',
      targetType: 'resource',
      targetId: resource.id,
      newValue: { file_ids: input.file_ids },
    });
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
