import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { type Role } from "../types.js";
import { env } from "../env.js";
import { AppError } from "../errors.js";

export interface AuthedUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

const COOKIE_NAME = "auth-token";
const TOKEN_TTL = "2h";

export function signToken(user: AuthedUser): string {
  return jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

/** Sets the JWT as an httpOnly cookie. Secure only in production. */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000, // 2 hours in ms
    path: "/",
  });
}

/** Clears the auth cookie on logout. */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

/**
 * Verifies auth token and attaches req.user.
 * Reads from the httpOnly cookie first; falls back to Authorization: Bearer
 * header so API tooling (curl, Postman) still works without a browser.
 * Fails closed: 401 on missing/invalid/expired token.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const fromCookie = req.cookies?.[COOKIE_NAME] as string | undefined;
  const fromHeader = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length)
    : undefined;

  const token = fromCookie ?? fromHeader;
  if (!token) return next(AppError.unauthorized("Missing authentication token"));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthedUser;
    req.user = payload;
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired token"));
  }
}

