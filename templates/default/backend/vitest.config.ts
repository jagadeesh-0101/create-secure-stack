import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // globalSetup: runs once in main process before any workers — handles prisma db push
    globalSetup: ["./src/tests/globalSetup.ts"],
    // setupFiles: runs in each worker before test file imports — sets env vars
    setupFiles: ["./src/tests/setup.ts"],
    // singleFork: all test files share one worker process, so:
    //   - no concurrent SQLite access between files
    //   - env vars set in setupFiles are visible to all test files
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
