import type { Request, Response } from 'express';
import { sendNotImplemented } from '../utils/apiResponse';

export function listPendingResources(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function approveResource(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function rejectResource(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function listUsers(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function changeUserRole(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function banUser(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function listReports(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function resolveReport(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function listAuditLogs(_req: Request, res: Response): void {
  sendNotImplemented(res);
}
