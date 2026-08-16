import type { Request, Response, NextFunction } from "express";
import { env } from "../env.js";
import { AppError } from "../errors.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Origin validation — defence-in-depth on top of SameSite=Lax cookies.
 *
 * Why: SameSite=Lax is scoped to the *registrable domain*, not the full origin.
 * That means it works correctly when frontend and backend share a site
 * (e.g. app.example.com → api.example.com), but silently fails when they live
 * on different domains (e.g. Vercel frontend → Render/Fly backend).
 * In that cross-domain topology the browser never sends the cookie at all, so
 * authenticated requests fail mysteriously instead of failing loudly.
 *
 * This middleware validates the Origin header (or Referer as fallback) against
 * FRONTEND_URL on every state-changing request. The result:
 *   - Same-domain deployments: Origin matches, no change in behaviour.
 *   - Cross-domain deployments with cookies not sent: 403 with INVALID_ORIGIN
 *     immediately, which is a loud, debuggable failure rather than a silent one.
 *   - Genuine CSRF attempts from a foreign origin: also 403.
 *
 * GET/HEAD/OPTIONS are exempt — they must be safe/idempotent by convention.
 */
export function validateOrigin(req: Request, _res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  // Bearer token requests are not CSRF-vulnerable — a cross-site attacker can trick a
  // browser into sending ambient cookies, but cannot forge an Authorization header.
  // Skipping the Origin check here preserves the API-tooling fallback in requireAuth
  // (curl, Postman, supertest without a browser) while still protecting cookie sessions.
  if (req.headers["authorization"]?.startsWith("Bearer ")) return next();

  const origin = req.headers["origin"] ?? req.headers["referer"];

  if (!origin || !origin.startsWith(env.FRONTEND_URL)) {
    return next(
      new AppError(403, "Request origin not allowed", "INVALID_ORIGIN")
    );
  }

  next();
}
