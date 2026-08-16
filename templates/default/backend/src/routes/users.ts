import { Router } from "express";
import { z } from "zod";
import { Role } from "../types.js";
import { prisma } from "../db.js";
import { decryptField } from "../crypto.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { logAction } from "../auditLog.js";
import { AppError } from "../errors.js";

export const usersRouter = Router();

// Every route below requires a valid JWT.
usersRouter.use(requireAuth);

const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

/**
 * GET /users/me
 * Any authenticated user can read their own profile.
 */
usersRouter.get("/me", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return next(AppError.notFound("User not found"));
    res.json({ id: user.id, email: user.email, role: user.role, createdAt: user.createdAt });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /users?limit=20&cursor=<id>
 * Admin-only. Lists accounts with cursor-based pagination (no sensitive fields).
 */
usersRouter.get("/", requireRole(Role.admin), async (req, res, next) => {
  try {
    const parsed = pageSchema.safeParse(req.query);
    if (!parsed.success) {
      return next(AppError.badRequest(parsed.error.errors[0].message));
    }
    const { limit, cursor } = parsed.data;

    const rows = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: limit + 1, // fetch one extra to determine if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const users = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? users[users.length - 1].id : null;

    res.json({ users, nextCursor });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /users/:id/ssn
 * Admin-only. Decrypts the requested user's SSN on the fly and logs the
 * access. This is the showcase route: RBAC gates *who* can call it,
 * field-level encryption means the DB never held the plaintext, and the
 * audit log records *that* the value was viewed (never the value itself).
 */
usersRouter.get("/:id/ssn", requireRole(Role.admin), async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return next(AppError.notFound("User not found"));

    if (!target.ssnEncrypted) {
      return next(AppError.notFound("This user has no SSN on file"));
    }

    let ssn: string;
    try {
      ssn = decryptField(target.ssnEncrypted);
    } catch {
      return next(AppError.internal("Failed to decrypt field — data may be corrupted", "DECRYPT_ERROR"));
    }

    await logAction({
      userId: req.user!.id,
      action: "user.view_sensitive_field",
      metadata: { field: "ssn", targetUserId: target.id },
    });

    res.json({ userId: target.id, ssn });
  } catch (err) {
    next(err);
  }
});
