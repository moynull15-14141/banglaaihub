import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';

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
          next(new ApiError(403, 'FORBIDDEN', 'Insufficient permissions.'));
          return;
        }

        next();
      })
      .catch((error: unknown) => {
        next(error);
      });
  };
}
