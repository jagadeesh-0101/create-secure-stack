import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "../types.js";
import { prisma } from "../db.js";
import { encryptField } from "../crypto.js";
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from "../middleware/auth.js";
import { logAction } from "../auditLog.js";
import { AppError } from "../errors.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  ssn: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return next(AppError.badRequest(parsed.error.errors[0].message));
    }
    const { email, password, ssn } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return next(new AppError(409, "An account with that email already exists", "CONFLICT"));
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.member,
        // Example of a sensitive field encrypted before it ever touches the DB.
        ssnEncrypted: typeof ssn === "string" && ssn.length > 0 ? encryptField(ssn) : null,
      },
    });

    await logAction({ userId: user.id, action: "user.register", metadata: { email } });

    const token = signToken({ id: user.id, role: user.role as Role });
    setAuthCookie(res, token);

    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return next(AppError.badRequest(parsed.error.errors[0].message));
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !validPassword) {
      // Same generic error whether the email or the password was wrong —
      // don't leak which one, that's a user-enumeration vector.
      await logAction({ action: "user.login_failed", metadata: { email } });
      return next(AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS"));
    }

    await logAction({ userId: user.id, action: "user.login", metadata: { email } });

    const token = signToken({ id: user.id, role: user.role as Role });
    setAuthCookie(res, token);

    res.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    clearAuthCookie(res);
    await logAction({ userId: req.user!.id, action: "user.logout" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
