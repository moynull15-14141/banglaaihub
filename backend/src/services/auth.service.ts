import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { comparePassword, hashPassword, sha256 } from '../utils/hash';
import {
  signAccessToken,
  signActionToken,
  signRefreshToken,
  verifyActionToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { EmailService } from './email.service';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_HISTORY_LIMIT = 5;
const DEFAULT_ROLE_NAME = 'user';

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  reputationScore: number;
  roles: string[];
}

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export async function getUserRoleNames(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });

  return userRoles.map((userRole) => userRole.role.name);
}

async function issueTokenPair(
  userId: string,
  email: string,
  context: RequestContext,
): Promise<AuthTokens> {
  const roles = await getUserRoleNames(userId);
  const accessToken = signAccessToken({ userId, email, roles });
  const refreshToken = signRefreshToken({ userId });

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    },
  });

  return { accessToken, refreshToken };
}

function toPublicUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  reputationScore: number;
}): Omit<PublicUser, 'roles'> {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    // Only pass through externally-hosted URLs (e.g. Google's photo) here —
    // R2 object keys need signing, which this synchronous mapper can't do.
    avatarUrl: user.avatarUrl && /^https?:\/\//i.test(user.avatarUrl) ? user.avatarUrl : null,
    reputationScore: user.reputationScore,
  };
}

export class AuthService {
  static async register(
    input: RegisterInput,
  ): Promise<{ id: string; email: string; username: string }> {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
    });

    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'Email or username is already in use.');
    }

    const passwordHash = await hashPassword(input.password);
    const defaultRole = await prisma.role.findUnique({ where: { name: DEFAULT_ROLE_NAME } });

    if (!defaultRole) {
      throw new ApiError(
        500,
        'INTERNAL_ERROR',
        'Default role is not seeded. Run the database seed script.',
      );
    }

    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName ?? null,
        passwordHash,
        userRoles: {
          create: { roleId: defaultRole.id },
        },
      },
    });

    await prisma.passwordHistory.create({
      data: { userId: user.id, passwordHash },
    });

    const verifyToken = signActionToken({ userId: user.id, purpose: 'email_verification' });
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${verifyToken}`;

    try {
      await EmailService.sendVerificationEmail(user.email, user.username, verifyUrl);
    } catch (error) {
      // A failed transactional email must not roll back account creation — the
      // account exists either way, so log and continue rather than error out.
      logger.warn('Verification email failed to send', {
        userId: user.id,
        error: error instanceof Error ? error.message : error,
      });
    }

    return { id: user.id, email: user.email, username: user.username };
  }

  static async login(
    input: LoginInput,
    context: RequestContext,
  ): Promise<{ user: PublicUser } & AuthTokens> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const invalidCredentialsError = new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password.');

    if (!user || !user.passwordHash || user.deletedAt) {
      throw invalidCredentialsError;
    }

    const passwordMatches = await comparePassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentialsError;
    }

    if (user.status !== 'active') {
      throw new ApiError(403, 'FORBIDDEN', 'This account is not active.');
    }

    if (!user.emailVerified) {
      throw new ApiError(403, 'FORBIDDEN', 'Please verify your email before logging in.');
    }

    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email, context);
    const roles = await getUserRoleNames(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return { accessToken, refreshToken, user: { ...toPublicUser(user), roles } };
  }

  static async refresh(refreshToken: string, context: RequestContext): Promise<AuthTokens> {
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token.');
    }

    const tokenHash = sha256(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token not recognized.');
    }

    if (stored.revoked) {
      // Reuse of a revoked token indicates the token was compromised — revoke
      // every session for this user, per doc 13's replay-attack response.
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });
      throw new ApiError(401, 'UNAUTHORIZED', 'Token reuse detected. Please log in again.');
    }

    if (stored.expiresAt < new Date()) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token has expired.');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.deletedAt) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Account no longer exists.');
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    return issueTokenPair(user.id, user.email, context);
  }

  static async logout(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  static async verifyEmail(token: string): Promise<void> {
    let payload: { userId: string };
    try {
      payload = verifyActionToken(token, 'email_verification');
    } catch {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid or expired verification token.');
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: { emailVerified: true },
    });
  }

  static async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });

    // Do not reveal whether the email exists — respond the same way either way.
    if (!user || user.deletedAt) {
      return;
    }

    const resetToken = signActionToken({ userId: user.id, purpose: 'password_reset' });
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await EmailService.sendPasswordResetEmail(user.email, user.username, resetUrl);
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: { userId: string };
    try {
      payload = verifyActionToken(token, 'password_reset');
    } catch {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid or expired reset token.');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.deletedAt) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid or expired reset token.');
    }

    const history = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_LIMIT - 1,
    });

    const previousHashes = [
      user.passwordHash,
      ...history.map((entry) => entry.passwordHash),
    ].filter((hash): hash is string => hash !== null);

    for (const previousHash of previousHashes) {
      if (await comparePassword(newPassword, previousHash)) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          `New password must not match any of your last ${PASSWORD_HISTORY_LIMIT} passwords.`,
        );
      }
    }

    const newHash = await hashPassword(newPassword);

    if (user.passwordHash) {
      await prisma.passwordHistory.create({
        data: { userId: user.id, passwordHash: user.passwordHash },
      });
    }

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

    // Prune history beyond the retention window.
    const staleHistory = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: PASSWORD_HISTORY_LIMIT,
      select: { id: true },
    });
    if (staleHistory.length > 0) {
      await prisma.passwordHistory.deleteMany({
        where: { id: { in: staleHistory.map((entry) => entry.id) } },
      });
    }

    // Force re-login everywhere after a password change.
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  static async getUserPermissions(userId: string): Promise<Set<string>> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });

    const permissions = new Set<string>();
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        permissions.add(rolePermission.permission.name);
      }
    }

    return permissions;
  }

  static getGoogleAuthUrl(state?: string): string {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CALLBACK_URL) {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Google OAuth is not configured.');
    }

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      ...(state ? { state } : {}),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  static async handleGoogleCallback(
    code: string,
    context: RequestContext,
  ): Promise<{ user: PublicUser } & AuthTokens> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Google OAuth is not configured.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Failed to exchange Google authorization code.');
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Failed to fetch Google profile.');
    }

    const profile = (await profileResponse.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
    });

    if (!user) {
      const defaultRole = await prisma.role.findUnique({ where: { name: DEFAULT_ROLE_NAME } });
      if (!defaultRole) {
        throw new ApiError(
          500,
          'INTERNAL_ERROR',
          'Default role is not seeded. Run the database seed script.',
        );
      }

      user = await prisma.user.create({
        data: {
          email: profile.email,
          username: profile.email.split('@')[0] + '_' + profile.sub.slice(-6),
          displayName: profile.name ?? null,
          avatarUrl: profile.picture ?? null,
          googleId: profile.sub,
          emailVerified: true,
          userRoles: { create: { roleId: defaultRole.id } },
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: profile.sub } });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user.id, user.email, context);
    const roles = await getUserRoleNames(user.id);
    // Refresh the Google avatar on login, but never clobber a self-uploaded
    // avatar (stored as an R2 key rather than an http(s) URL).
    const hasCustomAvatar = !!user.avatarUrl && !/^https?:\/\//i.test(user.avatarUrl);
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...(profile.picture && !hasCustomAvatar ? { avatarUrl: profile.picture } : {}),
      },
    });

    return { accessToken, refreshToken, user: { ...toPublicUser(user), roles } };
  }
}
