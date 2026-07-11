import type { Request, Response } from 'express';
import { SeoService } from '../services/seo.service';
import { sendSuccess } from '../utils/apiResponse';
import type { DuplicateCheckQuery } from '../validators/seo.validator';

export async function checkDuplicate(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as DuplicateCheckQuery;
  const result = await SeoService.checkDuplicate(query.field, query.value, query.exclude_slug);
  sendSuccess(res, result);
}

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const dashboard = await SeoService.getDashboard();
  sendSuccess(res, dashboard);
}
