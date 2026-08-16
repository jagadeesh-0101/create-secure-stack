import rateLimit from "express-rate-limit";
import { logAction } from "../auditLog.js";

/**
 * Rate limiter scoped to /auth/* routes.
 * 10 requests per 15-minute window per IP.
 * Returns 429 with Retry-After + RateLimit-* headers (RFC 6585).
 * Limit trips are written to the audit log for visibility alongside other
 * security events (failed logins, SSN views, etc.).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-7", // RateLimit-* headers per RFC 6585
  legacyHeaders: false,
  message: { error: "Too many requests — please try again later.", code: "RATE_LIMITED" },
  handler: async (req, res, _next, options) => {
    // Fire-and-forget audit log — don't await so we don't slow down the 429 response
    logAction({
      userId: null, // not authenticated yet at this point
      action: "auth.rate_limited",
      metadata: { ip: req.ip, path: req.path, method: req.method },
    }).catch(() => {/* audit log failure must not mask the 429 */});

    res.status(options.statusCode).json(options.message);
  },
  skip: () => process.env.NODE_ENV === "test", // don't limit during tests
});
