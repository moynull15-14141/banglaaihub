import type { Request, Response } from 'express';
import { MeilisearchRequestError, MeilisearchRequestTimeOutError } from 'meilisearch';
import { SearchService } from '../services/search.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { SearchQuery } from '../validators/search.validator';

export async function search(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as SearchQuery;
  const pagination = parsePagination(req.query as Record<string, string>);

  try {
    const result = await SearchService.search(query, pagination);
    sendSuccess(res, result.data, result.meta);
  } catch (error) {
    if (
      error instanceof MeilisearchRequestError ||
      error instanceof MeilisearchRequestTimeOutError
    ) {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Search service is temporarily unavailable.');
    }
    throw error;
  }
}
