import "./env.js"; // validates env vars at startup — must be first
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { authRateLimiter } from "./middleware/rateLimiter.js";
import { validateOrigin } from "./middleware/csrf.js";
import { prisma } from "./db.js";
import { logger } from "./logger.js";
import { AppError } from "./errors.js";

export const app = express();

// --- Security headers (helmet sets CSP, HSTS, X-Frame-Options, etc.) ---
app.use(helmet());

// --- CORS: explicit origin allowlist, credentials required for cookies ---
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(cookieParser());
app.use(express.json());
// Origin validation: defence-in-depth for CSRF and cross-domain misconfiguration.
// See middleware/csrf.ts for rationale.
app.use(validateOrigin);

// --- Health check: verifies the process is alive AND the DB is reachable ---
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch {
    res.status(503).json({ ok: false, db: false, error: "Database unreachable" });
  }
});

// --- Routes ---
app.use("/auth", authRateLimiter, authRouter);
app.use("/users", usersRouter);

// --- Global error handler: returns { error, code } JSON, never HTML stack traces ---
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    logger.error(err, "Unhandled error");
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
);
