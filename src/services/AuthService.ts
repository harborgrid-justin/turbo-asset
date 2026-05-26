import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { AuthenticationError } from '../middleware/errorHandler';
import { UserPayload } from '../types/express';
import { logger } from '@/config/logger';

/**
 * Default role -> permission mapping. Admin roles get the wildcard; lower roles
 * get a conservative read baseline. This is a sane default RBAC matrix meant to
 * be tuned per deployment, not an exhaustive policy.
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: ['*'],
  manager: ['*'],
  user: [
    'properties:read',
    'assets:read',
    'workflows:read',
    'documents:read',
    'reports:read',
  ],
  readonly: [
    'properties:read',
    'assets:read',
    'workflows:read',
    'documents:read',
    'reports:read',
  ],
};

const signExpiresIn = config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'];

export interface LoginResult {
  token: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    organizationId: string;
  };
}

export class AuthService {
  /**
   * Authenticate a user with email + password and issue a signed JWT.
   * Uses a constant generic error so we never reveal whether the email exists.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.isActive === false) {
      throw new AuthenticationError('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash ?? '');
    if (!passwordMatches) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Best-effort last-login stamp; never block login on this.
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      logger.warn('Failed to update lastLoginAt', { userId: user.id, error });
    }

    return {
      token: this.issueToken(user),
      expiresIn: config.auth.jwtExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: String(user.role ?? 'user').toLowerCase(),
        organizationId: user.organizationId ?? '',
      },
    };
  }

  /** Build the JWT payload (matching UserPayload) and sign it. */
  issueToken(user: Record<string, any>): string {
    const role = String(user.role ?? 'user').toLowerCase();
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId ?? '',
      roles: [role],
      permissions: ROLE_PERMISSIONS[role] ?? [],
    };
    return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: signExpiresIn });
  }

  /** Re-issue a token from a still-valid one (sliding expiry). */
  refresh(token: string): { token: string; expiresIn: string } {
    let decoded: UserPayload & { iat?: number; exp?: number };
    try {
      decoded = jwt.verify(token, config.auth.jwtSecret) as UserPayload & {
        iat?: number;
        exp?: number;
      };
    } catch {
      throw new AuthenticationError('Invalid or expired token');
    }

    const { iat: _iat, exp: _exp, ...claims } = decoded;
    const newToken = jwt.sign(claims, config.auth.jwtSecret, { expiresIn: signExpiresIn });
    return { token: newToken, expiresIn: config.auth.jwtExpiresIn };
  }
}

export const authService = new AuthService();
