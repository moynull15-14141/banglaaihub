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

export function toResourceDto(resource: ResourceWithRelations): Record<string, unknown> {
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
    thumbnail_url: resource.thumbnailUrl,
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
          file_url: resource.dataset.fileUrl,
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
          pdf_url: resource.paper.pdfUrl,
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

    return { data: resources.map(toResourceDto), meta: buildPaginationMeta(total, pagination) };
  }

  static async getBySlug(slug: string, requester?: AccessTokenPayload): Promise<unknown> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      include: resourceInclude,
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    if (resource.status !== 'approved') {
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

    void prisma.resource.update({
      where: { id: resource.id },
      data: { viewCount: { increment: 1 } },
    });

    return toResourceDto(resource);
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

    void this.syncSearchIndex(resourceId);

    return toResourceDto(await this.getResourceWithRelations(resourceId));
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
  ): Promise<{ file_url: string }> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      include: { dataset: true },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    if (resource.type !== 'dataset' || !resource.dataset) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Only dataset resources support file uploads.');
    }

    if (resource.authorId !== requester.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the resource author can upload its file.');
    }

    const { key, checksum } = await StorageService.uploadDatasetFile(resource.id, file);

    await prisma.dataset.update({
      where: { resourceId: resource.id },
      data: { fileUrl: key, fileSizeBytes: BigInt(file.size), checksumSha256: checksum },
    });

    const fileUrl = await StorageService.getSignedDownloadUrl(key);

    await writeAuditLog({
      actorId: requester.userId,
      action: 'resource.upload_file',
      targetType: 'resource',
      targetId: resource.id,
      newValue: { key, size: file.size },
    });

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

    return { data: resources.map(toResourceDto), meta: buildPaginationMeta(total, pagination) };
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

    return { data: resources.map(toResourceDto), meta: buildPaginationMeta(total, pagination) };
  }
}
