import type { Request, Response } from 'express';
import { sendNotImplemented } from '../utils/apiResponse';

export function list(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function create(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function update(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function remove(_req: Request, res: Response): void {
  sendNotImplemented(res);
}

export function upvote(_req: Request, res: Response): void {
  sendNotImplemented(res);
}
