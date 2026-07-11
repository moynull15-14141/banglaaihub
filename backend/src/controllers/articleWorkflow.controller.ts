import type { Request, Response } from 'express';
import { ArticleAssignmentService } from '../services/articleAssignment.service';
import { ArticleCommentService } from '../services/articleComment.service';
import { ArticleLockService } from '../services/articleLock.service';
import { ArticleRevisionService } from '../services/articleRevision.service';
import { ArticleWorkflowService } from '../services/articleWorkflow.service';
import { AuthService } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import type { AccessTokenPayload } from '../utils/jwt';

// authorize() (middleware/authorize.ts) only supports AND-of-permissions —
// several editorial routes (comments, locking, revisions) should be usable
// by ANY editorial-staff permission, not all of them at once, so that check
// lives here instead of at the route layer.
const EDITORIAL_PERMISSIONS = ['content:create', 'content:edit', 'content:review', 'content:seo_review', 'content:publish'];

async function requireEditorialAccess(user: AccessTokenPayload): Promise<void> {
  const permissions = await AuthService.getUserPermissions(user.userId);
  if (!EDITORIAL_PERMISSIONS.some((permission) => permissions.has(permission))) {
    throw new ApiError(403, 'FORBIDDEN', 'Editorial staff access is required.');
  }
}
import type {
  AssignArticleInput,
  CompareRevisionsQuery,
  CreateEditorialCommentInput,
  ListEditorialCommentsQuery,
  ResolveEditorialCommentInput,
  UnassignArticleQuery,
  WorkflowTransitionInput,
} from '../validators/articleWorkflow.validator';

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

// --- Workflow transitions ---------------------------------------------------

export async function transition(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as WorkflowTransitionInput;
  const result = await ArticleWorkflowService.transition(requireParam(req, 'slug'), user, body.to_status);
  sendSuccess(res, result);
}

export async function availableTransitions(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await ArticleWorkflowService.availableTransitions(requireParam(req, 'slug'), user);
  sendSuccess(res, result);
}

// --- Assignments -------------------------------------------------------------

export async function listAssignments(req: Request, res: Response): Promise<void> {
  await requireEditorialAccess(requireUser(req));
  const result = await ArticleAssignmentService.list(requireParam(req, 'slug'));
  sendSuccess(res, result);
}

export async function assign(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as AssignArticleInput;
  const result = await ArticleAssignmentService.assign(requireParam(req, 'slug'), user, body);
  sendSuccess(res, result, undefined, 201);
}

export async function unassign(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const query = req.validatedQuery as UnassignArticleQuery;
  await ArticleAssignmentService.unassign(requireParam(req, 'slug'), user, query.role);
  sendSuccess(res, { message: 'Assignment removed.' });
}

export async function listAssignedToMe(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await ArticleAssignmentService.listAssignedToMe(user.userId);
  sendSuccess(res, result);
}

// --- Editorial comments / notes ----------------------------------------------

export async function listEditorialComments(req: Request, res: Response): Promise<void> {
  await requireEditorialAccess(requireUser(req));
  const query = (req.validatedQuery ?? {}) as ListEditorialCommentsQuery;
  const result = await ArticleCommentService.list(requireParam(req, 'slug'), query.kind);
  sendSuccess(res, result);
}

export async function createEditorialComment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await requireEditorialAccess(user);
  const body = req.validatedBody as CreateEditorialCommentInput;
  const result = await ArticleCommentService.create(requireParam(req, 'slug'), user, body);
  sendSuccess(res, result, undefined, 201);
}

export async function resolveEditorialComment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await requireEditorialAccess(user);
  const body = req.validatedBody as ResolveEditorialCommentInput;
  const result = await ArticleCommentService.resolve(requireParam(req, 'commentId'), user, body.resolved);
  sendSuccess(res, result);
}

export async function removeEditorialComment(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await requireEditorialAccess(user);
  await ArticleCommentService.remove(requireParam(req, 'commentId'), user);
  sendSuccess(res, { message: 'Comment deleted.' });
}

// --- Content locking ----------------------------------------------------------

export async function getLockStatus(req: Request, res: Response): Promise<void> {
  await requireEditorialAccess(requireUser(req));
  const result = await ArticleLockService.getStatus(requireParam(req, 'slug'));
  sendSuccess(res, result);
}

export async function acquireLock(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await requireEditorialAccess(user);
  const result = await ArticleLockService.acquireOrHeartbeat(requireParam(req, 'slug'), user);
  sendSuccess(res, result);
}

export async function releaseLock(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await requireEditorialAccess(user);
  await ArticleLockService.release(requireParam(req, 'slug'), user);
  sendSuccess(res, { message: 'Lock released.' });
}

export async function forceReleaseLock(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await ArticleLockService.forceRelease(requireParam(req, 'slug'), user);
  sendSuccess(res, { message: 'Lock force-released.' });
}

// --- Revisions -----------------------------------------------------------------

export async function listRevisions(req: Request, res: Response): Promise<void> {
  await requireEditorialAccess(requireUser(req));
  const result = await ArticleRevisionService.list(requireParam(req, 'slug'));
  sendSuccess(res, result);
}

export async function compareRevisions(req: Request, res: Response): Promise<void> {
  await requireEditorialAccess(requireUser(req));
  const query = req.validatedQuery as CompareRevisionsQuery;
  const result = await ArticleRevisionService.compare(requireParam(req, 'revisionId'), query.against);
  sendSuccess(res, result);
}

export async function restoreRevision(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await ArticleRevisionService.restore(requireParam(req, 'revisionId'), user);
  sendSuccess(res, result);
}
