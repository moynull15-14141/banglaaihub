import type { Request, Response } from 'express';
import { MeilisearchRequestError, MeilisearchRequestTimeOutError } from 'meilisearch';
import { SearchService } from '../services/search.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { PopularSearchesQuery, SearchQuery, SuggestQuery } from '../validators/search.validator';

export async function search(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as SearchQuery;
  const pagination = parsePagination(req.query as Record<string, string>);

  try {
    const result = await SearchService.search(query, pagination, req.user?.userId);
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

export async function suggest(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as SuggestQuery;
  try {
    const results = await SearchService.suggest(query.q);
    sendSuccess(res, results);
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

export async function popular(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as PopularSearchesQuery;
  const results = await SearchService.getPopularSearches(query.days, query.limit);
  sendSuccess(res, results);
}

export async function filters(_req: Request, res: Response): Promise<void> {
  try {
    const licenses = await SearchService.getLicenseFacets();
    sendSuccess(res, { licenses });
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
