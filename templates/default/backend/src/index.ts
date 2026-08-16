import { app } from "./app.js";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

const server = app.listen(env.PORT, () => {
  logger.info(`create-secure-stack backend listening on http://localhost:${env.PORT}`);
});

/** Graceful shutdown — finish in-flight requests, then close DB connection. */
function shutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed cleanly");
    process.exit(0);
  });
  // Force-exit if shutdown takes longer than 10s
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
