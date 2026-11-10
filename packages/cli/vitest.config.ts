import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Windows runs the suite several times slower (process spawn, NTFS,
    // antivirus scanning). The all-platform configurator loops take ~6 s alone
    // but 10-15 s in the parallel run, so a 10 s limit fails them at random.
    // Linux CI keeps the strict hang detector.
    testTimeout: process.platform === "win32" ? 30_000 : 10_000,
    include: ["test/**/*.test.ts"],
    exclude: ["third/**", "node_modules/**"],
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/cli/index.ts"],
      reportsDirectory: "./coverage",
    },
  },
});
