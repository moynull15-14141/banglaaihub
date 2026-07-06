import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  roles: string[];
}

export interface RefreshTokenPayload {
  userId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
  }) as RefreshTokenPayload;
}

// Stateless action tokens for email verification / password reset (doc 10 has no
// token-storage table for either flow, so these are signed rather than DB-backed —
// short expiries keep the "can't revoke before expiry" tradeoff small).
export type ActionTokenPurpose = 'email_verification' | 'password_reset';

export interface ActionTokenPayload {
  userId: string;
  purpose: ActionTokenPurpose;
}

const ACTION_TOKEN_EXPIRY = {
  email_verification: '24h',
  password_reset: '1h',
} as const satisfies Record<ActionTokenPurpose, string>;

export function signActionToken(payload: ActionTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACTION_TOKEN_EXPIRY[payload.purpose],
  });
}

export function verifyActionToken(
  token: string,
  expectedPurpose: ActionTokenPurpose,
): ActionTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as ActionTokenPayload;

  if (decoded.purpose !== expectedPurpose) {
    throw new Error('Action token purpose mismatch.');
  }

  return decoded;
}
