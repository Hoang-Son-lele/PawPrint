import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../errors';

export interface AuthUser {
  id: string;
  role: 'USER' | 'ADMIN';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

interface AccessTokenPayload {
  sub: string;
  role: AuthUser['role'];
  typ: 'access';
}

export function signAccessToken(user: AuthUser): string {
  const payload: AccessTokenPayload = { sub: user.id, role: user.role, typ: 'access' };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'pawprint-api',
  });
}

/** Bắt buộc access token hợp lệ (Authorization: Bearer <token>). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, {
      issuer: 'pawprint-api',
    }) as AccessTokenPayload;
    if (payload.typ !== 'access') throw new Error('wrong token type');
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn', {
        reason: 'TOKEN_EXPIRED',
      });
    }
    throw AppError.unauthorized('Token không hợp lệ');
  }
}

/** RBAC: chỉ cho phép các role chỉ định (dùng sau requireAuth). */
export const requireRole =
  (...roles: AuthUser['role'][]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };

/** Lấy user đã xác thực – dùng trong controller sau requireAuth. */
export function authUser(req: Request): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
