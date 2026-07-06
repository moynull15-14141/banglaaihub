import type { AccessTokenPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AccessTokenPayload;
      validatedBody?: unknown;
    }
  }
}

export {};
