import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodType, target: ValidationTarget = 'body') {
  return function validateMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const result = schema.safeParse(req[target]);

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

    if (target === 'query') {
      req.validatedQuery = result.data;
    } else if (target === 'params') {
      req.validatedParams = result.data;
    } else {
      req.validatedBody = result.data;
    }

    next();
  };
}
