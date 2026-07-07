import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';

// A single missing permission gets a purpose-specific message where one is
// worth the extra clarity; anything else falls back to the generic message.
const FRIENDLY_FORBIDDEN_MESSAGES: Record<string, string> = {
  'resource:create': 'Become a contributor to submit resources.',
  'resource:upload': 'Become a contributor to upload dataset files.',
};

export function authorize(...requiredPermissions: string[]) {
  return function authorizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) {
      next(new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.'));
      return;
    }

    AuthService.getUserPermissions(req.user.userId)
      .then((userPermissions) => {
        const hasAll = requiredPermissions.every((permission) => userPermissions.has(permission));

        if (!hasAll) {
          const message =
            requiredPermissions.length === 1
              ? FRIENDLY_FORBIDDEN_MESSAGES[requiredPermissions[0]]
              : undefined;
          next(new ApiError(403, 'FORBIDDEN', message ?? 'Insufficient permissions.'));
          return;
        }

        next();
      })
      .catch((error: unknown) => {
        next(error);
      });
  };
}
