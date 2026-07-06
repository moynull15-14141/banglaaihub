import type { Request, Response } from 'express';
import { sendNotImplemented } from '../utils/apiResponse';

export function search(_req: Request, res: Response): void {
  sendNotImplemented(res);
}
