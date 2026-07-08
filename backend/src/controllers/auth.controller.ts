import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { AuthService } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../validators/auth.validator';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const OAUTH_STATE_COOKIE_NAME = 'oauthState';
const OAUTH_STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
const OAUTH_STATE_COOKIE_PATH = '/api/v1/auth/google';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/v1/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

function requestContext(req: Request): { ipAddress?: string; userAgent?: string } {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

function getRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[REFRESH_COOKIE_NAME];
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as RegisterInput;

  const user = await AuthService.register({
    email: body.email,
    username: body.username,
    password: body.password,
    displayName: body.display_name,
  });

  sendSuccess(
    res,
    {
      message: 'Registration successful. Please check your email to verify your account.',
      user,
    },
    undefined,
    201,
  );
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as LoginInput;
  const result = await AuthService.login(
    { email: body.email, password: body.password },
    requestContext(req),
  );

  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, {
    accessToken: result.accessToken,
    user: {
      id: result.user.id,
      email: result.user.email,
      username: result.user.username,
      display_name: result.user.displayName,
      avatar_url: result.user.avatarUrl,
      reputation_score: result.user.reputationScore,
      roles: result.user.roles,
    },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = getRefreshCookie(req);
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token missing.');
  }

  const result = await AuthService.refresh(token, requestContext(req));
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, { accessToken: result.accessToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = getRefreshCookie(req);
  if (token) {
    await AuthService.logout(token);
  }

  clearRefreshCookie(res);
  sendSuccess(res, { message: 'Logged out successfully.' });
}

export function googleRedirect(_req: Request, res: Response): void {
  // CSRF protection for the OAuth flow: a random nonce is bound to the
  // browser via a short-lived httpOnly cookie and must come back unchanged
  // in the callback's `state` param, otherwise a forged callback (e.g. an
  // attacker's own authorization code) could complete against a victim's
  // session. `sameSite: 'lax'` (not 'strict') is required here specifically
  // because this cookie must survive the top-level redirect Google sends
  // the browser back with — 'strict' would silently drop it.
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_MS,
    path: OAUTH_STATE_COOKIE_PATH,
  });
  res.redirect(AuthService.getGoogleAuthUrl(state));
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const cookies = req.cookies as Record<string, string> | undefined;
  const expectedState = cookies?.[OAUTH_STATE_COOKIE_NAME];
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: OAUTH_STATE_COOKIE_PATH });

  if (!code) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Missing authorization code.');
  }
  if (!state || !expectedState || state !== expectedState) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid or expired sign-in attempt. Please try again.');
  }

  const result = await AuthService.handleGoogleCallback(code, requestContext(req));
  setRefreshCookie(res, result.refreshToken);
  res.redirect(`${env.FRONTEND_URL}/auth/callback?accessToken=${result.accessToken}`);
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as VerifyEmailInput;
  await AuthService.verifyEmail(body.token);
  sendSuccess(res, { message: 'Email verified successfully.' });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as ForgotPasswordInput;
  await AuthService.forgotPassword(body.email);
  sendSuccess(res, { message: 'If an account exists for that email, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as ResetPasswordInput;
  await AuthService.resetPassword(body.token, body.password);
  sendSuccess(res, { message: 'Password reset successfully.' });
}
