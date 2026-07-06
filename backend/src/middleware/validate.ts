import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

export function validate(schema: ZodType) {
  return function validateMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(
        new ApiError(
          400,
          'VALIDATION_ERROR',
          'Input validation failed.',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
      );
      return;
    }

    req.validatedBody = result.data;
    next();
  };
}
