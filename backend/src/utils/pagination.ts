export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(query: { page?: string; limit?: string }): PaginationParams {
  const rawPage = Number.parseInt(query.page ?? '', 10);
  const rawLimit = Number.parseInt(query.limit ?? '', 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  return { page, limit };
}

export function buildPaginationMeta(total: number, params: PaginationParams): PaginationMeta {
  return {
    total,
    page: params.page,
    limit: params.limit,
    hasNextPage: params.page * params.limit < total,
  };
}
