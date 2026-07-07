import type { Request, Response } from 'express';
import { ResourceService } from '../services/resources.service';
import { UserService } from '../services/users.service';
import { ApiError } from '../utils/ApiError';
import { sendNotImplemented, sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  CreateCategoryInput,
  CreateResourceInput,
  ListResourcesQuery,
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
  await ResourceService.softDelete(requireParam(req, 'slug'), user);
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
  const { url } = await ResourceService.getDownloadUrl(requireParam(req, 'slug'), req.user);
  res.redirect(302, url);
}

export async function share(req: Request, res: Response): Promise<void> {
  await ResourceService.logShare(requireParam(req, 'slug'), req.user);
  sendSuccess(res, { message: 'Share recorded.' });
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

export function report(_req: Request, res: Response): void {
  sendNotImplemented(res);
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
