export interface ResponseMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasNextPage?: boolean;
  unread_count?: number;
  next_cursor?: string | null;
  mode?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
