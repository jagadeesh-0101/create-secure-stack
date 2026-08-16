import "dotenv/config";

/**
 * Validated, typed environment configuration.
 * Imported by every module that needs env vars — never read process.env directly.
 * Throws at startup (before any request is served) if a required var is missing/malformed.
 */

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

const jwtSecret = requireEnv("JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

const encKey = requireEnv("FIELD_ENCRYPTION_KEY");
if (encKey.length !== 64 || !/^[0-9a-f]+$/i.test(encKey)) {
  throw new Error(
    "FIELD_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: jwtSecret,
  FIELD_ENCRYPTION_KEY: encKey,
  FRONTEND_URL: requireEnv("FRONTEND_URL"),
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
};
