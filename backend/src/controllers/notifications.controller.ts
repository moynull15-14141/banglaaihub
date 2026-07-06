import type { Request, Response } from 'express';
import { sendNotImplemented } from '../utils/apiResponse';

export function list(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function markRead(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function markAllRead(_req: Request, res: Response): void {
  sendNotImplemented(res);
}
