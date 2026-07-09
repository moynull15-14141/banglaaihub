import type { Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { ResourceService } from '../services/resources.service';
import { UserService } from '../services/users.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  AddResourceAttachmentQuery,
  ConfirmDownloadQuery,
  CreateCategoryInput,
  CreateReportInput,
  CreateResourceInput,
  DeleteResourceQuery,
  GetDownloadUrlQuery,
  ListResourcesQuery,
  ReorderResourceAttachmentsInput,
  UpdateCategoryInput,
  UpdateResourceInput,
  UploadResourceFileQuery,
} from '../validators/resource.validator';

function requireUser(req: Request): AccessTokenPayload {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return req.user;
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', `Missing or invalid route parameter: ${name}`);
  }
  return value;
}

function requireIntParam(req: Request, name: string): number {
  const id = Number(requireParam(req, name));
  if (!Number.isInteger(id)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Invalid ${name} — must be an integer.`);
  }
  return id;
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListResourcesQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await ResourceService.list(query, pagination, req.user);
  sendSuccess(res, result.data, result.meta);
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateResourceInput;
  const result = await ResourceService.create(user.userId, body);
  sendSuccess(res, result, undefined, 201);
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const resource = await ResourceService.getBySlug(requireParam(req, 'slug'), req.user);
  sendSuccess(res, resource);
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpdateResourceInput;
  const resource = await ResourceService.update(requireParam(req, 'slug'), user, body);
  sendSuccess(res, resource);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const query = (req.validatedQuery ?? {}) as DeleteResourceQuery;
  await ResourceService.deleteResource(requireParam(req, 'slug'), user, { force: query.force === 'true' });
  sendSuccess(res, { message: 'Resource deleted.' });
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }

  const query = (req.validatedQuery ?? {}) as UploadResourceFileQuery;
  const result = await ResourceService.uploadFile(requireParam(req, 'slug'), user, req.file, query.kind);
  sendSuccess(res, result);
}

export async function download(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as GetDownloadUrlQuery;
  const result = await ResourceService.getDownloadUrl(requireParam(req, 'slug'), req.user, query.file_id);
  sendSuccess(res, result);
}

export async function confirmDownload(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ConfirmDownloadQuery;
  await ResourceService.confirmDownload(requireParam(req, 'slug'), req.user, query.file_id);
  sendSuccess(res, { message: 'Download recorded.' });
}

export async function share(req: Request, res: Response): Promise<void> {
  await ResourceService.logShare(requireParam(req, 'slug'), req.user);
  sendSuccess(res, { message: 'Share recorded.' });
}

// Phase 3A.1 — Prompt Fork / Version History.

export async function fork(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await ResourceService.fork(requireParam(req, 'slug'), user);
  sendSuccess(res, result, undefined, 201);
}

export async function getVersions(req: Request, res: Response): Promise<void> {
  const chain = await ResourceService.getVersionChain(requireParam(req, 'slug'), req.user);
  sendSuccess(res, chain);
}

// --- Attachments (ResourceFile) ---------------------------------------------

export async function addAttachment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }
  const query = (req.validatedQuery ?? {}) as AddResourceAttachmentQuery;
  const result = await ResourceService.addAttachment(
    requireParam(req, 'slug'),
    user,
    req.file,
    query.display_name,
  );
  sendSuccess(res, result, undefined, 201);
}

export async function deleteAttachment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await ResourceService.deleteAttachment(requireParam(req, 'slug'), user, requireParam(req, 'fileId'));
  sendSuccess(res, { message: 'Attachment deleted.' });
}

export async function replaceAttachment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }
  const result = await ResourceService.replaceAttachment(
    requireParam(req, 'slug'),
    user,
    requireParam(req, 'fileId'),
    req.file,
  );
  sendSuccess(res, result);
}

export async function reorderAttachments(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as ReorderResourceAttachmentsInput;
  await ResourceService.reorderAttachments(requireParam(req, 'slug'), user, body);
  sendSuccess(res, { message: 'Attachments reordered.' });
}

export async function addBookmark(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resourceId = await ResourceService.resolveIdBySlug(requireParam(req, 'slug'));
  await UserService.addBookmark(user.userId, resourceId);
  sendSuccess(res, { message: 'Bookmark added.' }, undefined, 201);
}

export async function removeBookmark(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resourceId = await ResourceService.resolveIdBySlug(requireParam(req, 'slug'));
  await UserService.removeBookmark(user.userId, resourceId);
  sendSuccess(res, { message: 'Bookmark removed.' });
}

export async function report(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateReportInput;
  const resourceId = await ResourceService.resolveIdBySlug(requireParam(req, 'slug'));
  const result = await ReportService.create(user.userId, resourceId, body.reason, body.description);
  sendSuccess(res, result, undefined, 201);
}

export async function listCategories(_req: Request, res: Response): Promise<void> {
  const categories = await ResourceService.listCategories();
  sendSuccess(res, categories);
}

export async function getCategoryBySlug(req: Request, res: Response): Promise<void> {
  const category = await ResourceService.getCategoryBySlug(requireParam(req, 'slug'));
  sendSuccess(res, category);
}

export async function listCategoryResources(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await ResourceService.listCategoryResources(requireParam(req, 'slug'), pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateCategoryInput;
  const category = await ResourceService.createCategory(body, user.userId);
  sendSuccess(res, category, undefined, 201);
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpdateCategoryInput;
  const id = requireIntParam(req, 'id');

  const category = await ResourceService.updateCategory(id, body, user.userId);
  sendSuccess(res, category);
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const id = requireIntParam(req, 'id');

  await ResourceService.deleteCategory(id, user.userId);
  sendSuccess(res, { message: 'Category deleted.' });
}

export async function listTags(_req: Request, res: Response): Promise<void> {
  const tags = await ResourceService.listTags();
  sendSuccess(res, tags);
}

export async function searchTags(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const tags = await ResourceService.searchTags(q);
  sendSuccess(res, tags);
}

export async function listTagResources(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await ResourceService.listTagResources(requireParam(req, 'slug'), pagination);
  sendSuccess(res, result.data, result.meta);
}
