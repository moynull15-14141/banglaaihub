import type { Request, Response } from 'express';
import { sendNotImplemented } from '../utils/apiResponse';

export function getPublicProfile(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function getOwnProfile(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function updateOwnProfile(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function getMyBookmarks(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function getMySubmissions(_req: Request, res: Response): void {
  sendNotImplemented(res);
}
