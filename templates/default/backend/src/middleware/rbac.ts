import type { Request, Response, NextFunction } from "express";
import { Role } from "../types.js";
import { AppError } from "../errors.js";

/**
 * Role-based access control middleware factory.
 * Must run after `requireAuth`, which populates `req.user`.
 *
 * Usage: router.get("/admin-only", requireAuth, requireRole(Role.admin), handler)
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized("Not authenticated"));
    }
    if (!allowedRoles.includes(req.user.role as Role)) {
      return next(
        AppError.forbidden(
          `Role "${req.user.role}" is not permitted to access this resource.`
        )
      );
    }
    next();
  };
}
