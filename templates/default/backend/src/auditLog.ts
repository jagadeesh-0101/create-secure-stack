import { prisma } from "./db.js";

interface LogActionInput {
  userId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records a security-relevant event. Call this anywhere a route touches
 * authentication, permissions, or sensitive data — not as an afterthought,
 * but as part of the route itself. Never pass secrets/plaintext sensitive
 * values into `metadata`; log *that* something was accessed, not the value.
 */
export async function logAction({ userId, action, metadata }: LogActionInput) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
