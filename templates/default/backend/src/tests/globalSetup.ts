import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";

const TEST_DB = "./test.db";
const TEST_ENV = {
  DATABASE_URL: `file:${TEST_DB}`,
  JWT_SECRET: "test-only-jwt-secret-must-be-at-least-32-chars-long!!",
  FIELD_ENCRYPTION_KEY: "a".repeat(64),
  FRONTEND_URL: "http://localhost:5173",
  NODE_ENV: "test",
};

/**
 * globalSetup runs once in the main process before any test workers spin up.
 * This is the right place to run prisma db push — it happens exactly once,
 * with no risk of SQLite lock contention from concurrent workers.
 */
export default function globalSetup() {
  execSync("npx prisma db push --force-reset --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, ...TEST_ENV },
  });

  // Return a teardown function — runs after all tests complete.
  return () => {
    for (const f of [TEST_DB, `${TEST_DB}-journal`]) {
      if (existsSync(f)) unlinkSync(f);
    }
  };
}
