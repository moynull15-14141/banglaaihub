import type { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { ContributorApplicationService } from '../services/contributor-application.service';
import { ReportService } from '../services/report.service';
import { ResourceService } from '../services/resources.service';
import { SearchService } from '../services/search.service';
import { UserService } from '../services/users.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  ListAuditLogsQuery,
  ListReportsQuery,
  ListUsersQuery,
  RejectReportInput,
  UpdateReportStatusInput,
  UpdateUserRolesInput,
  UpdateUserStatusInput,
} from '../validators/admin.validator';
import type { UpdateProfileInput } from '../validators/user.validator';
import type { ListResourcesQuery } from '../validators/resource.validator';
import type {
  ContributorApplicationDecisionInput,
  ListContributorApplicationsQuery,
} from '../validators/contributor-application.validator';

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

// --- Resource moderation ------------------------------------------------------

export async function listPendingResources(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListResourcesQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  // Defaults to 'pending' (this endpoint's original, sole behavior) when no
  // status is specified — additive only, existing callers are unaffected.
  const result = await ResourceService.list(
    { ...query, status: query.status ?? 'pending' },
    pagination,
    req.user,
  );
  sendSuccess(res, result.data, result.meta);
}

export async function approveResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resource = await ResourceService.approve(requireParam(req, 'id'), user.userId);
  sendSuccess(res, resource);
}

export async function rejectResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.body as { reason?: unknown };
  const reason = typeof body.reason === 'string' ? body.reason : undefined;
  const resource = await ResourceService.reject(requireParam(req, 'id'), user.userId, reason);
  sendSuccess(res, resource);
}

export async function featureResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resource = await ResourceService.setFeatured(requireParam(req, 'id'), true, user.userId);
  sendSuccess(res, resource);
}

export async function unfeatureResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resource = await ResourceService.setFeatured(requireParam(req, 'id'), false, user.userId);
  sendSuccess(res, resource);
}

export async function restoreResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resource = await ResourceService.restore(requireParam(req, 'id'), user.userId);
  sendSuccess(res, resource);
}

// --- User management -----------------------------------------------------------

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListUsersQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await UserService.listUsersAdmin(query, pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const user = await UserService.getUserByIdAdmin(requireParam(req, 'id'));
  sendSuccess(res, user);
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as UpdateProfileInput;
  const user = await UserService.updateUserAdmin(requireParam(req, 'id'), body, actor.userId);
  sendSuccess(res, user);
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as UpdateUserStatusInput;
  const user = await UserService.updateUserStatus(requireParam(req, 'id'), body, actor.userId);
  sendSuccess(res, user);
}

export async function updateUserRoles(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as UpdateUserRolesInput;
  const user = await UserService.updateUserRoles(requireParam(req, 'id'), body, actor.userId);
  sendSuccess(res, user);
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  await UserService.softDeleteUser(requireParam(req, 'id'), actor.userId);
  sendSuccess(res, { message: 'User deleted.' });
}

// --- Reports ---------------------------------------------------------------------

export async function listReports(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListReportsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await ReportService.list(query, pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function getReportById(req: Request, res: Response): Promise<void> {
  const report = await ReportService.getById(requireParam(req, 'id'));
  sendSuccess(res, report);
}

export async function updateReport(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as UpdateReportStatusInput;
  const report = await ReportService.updateStatus(
    requireParam(req, 'id'),
    body.status,
    actor.userId,
    'admin.report.update',
    body.reason,
  );
  sendSuccess(res, report);
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const report = await ReportService.updateStatus(
    requireParam(req, 'id'),
    'resolved',
    actor.userId,
    'admin.report.resolve',
  );
  sendSuccess(res, report);
}

export async function rejectReport(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as RejectReportInput;
  // doc 10's Report.status enum has no literal "rejected" value — "reject" maps
  // to the existing "dismissed" status, same as Phase 5's draft/pending mapping.
  const report = await ReportService.updateStatus(
    requireParam(req, 'id'),
    'dismissed',
    actor.userId,
    'admin.report.reject',
    body.reason,
  );
  sendSuccess(res, report);
}

// --- Contributor applications ------------------------------------------------------

export async function listContributorApplications(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListContributorApplicationsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await ContributorApplicationService.listForAdmin(query, pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function getContributorApplicationById(req: Request, res: Response): Promise<void> {
  const application = await ContributorApplicationService.getByIdForAdmin(requireParam(req, 'id'));
  sendSuccess(res, application);
}

export async function approveContributorApplication(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = (req.validatedBody ?? {}) as ContributorApplicationDecisionInput;
  const application = await ContributorApplicationService.approve(
    requireParam(req, 'id'),
    actor.userId,
    body,
  );
  sendSuccess(res, application);
}

export async function rejectContributorApplication(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = (req.validatedBody ?? {}) as ContributorApplicationDecisionInput;
  const application = await ContributorApplicationService.reject(
    requireParam(req, 'id'),
    actor.userId,
    body,
  );
  sendSuccess(res, application);
}

export async function requestContributorApplicationRevision(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = requireUser(req);
  const body = (req.validatedBody ?? {}) as ContributorApplicationDecisionInput;
  const application = await ContributorApplicationService.requestRevision(
    requireParam(req, 'id'),
    actor.userId,
    body,
  );
  sendSuccess(res, application);
}

// --- Audit logs -------------------------------------------------------------------

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListAuditLogsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await AdminService.listAuditLogs(query, pagination);
  sendSuccess(res, result.data, result.meta);
}

// --- Dashboard --------------------------------------------------------------------

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const stats = await AdminService.getDashboard();
  sendSuccess(res, stats);
}

// --- Search analytics (Phase 3B) ---------------------------------------------------

export async function getSearchAnalytics(_req: Request, res: Response): Promise<void> {
  const summary = await SearchService.getSearchAnalyticsSummary();
  sendSuccess(res, summary);
}
