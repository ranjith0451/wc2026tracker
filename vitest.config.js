import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure-logic suites run in node; files that touch localStorage opt into
    // happy-dom via a `// @vitest-environment happy-dom` docblock.
    environment: "node",
    include: ["src/**/*.test.{js,ts}", "api/**/*.test.{js,ts}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/data/**", "api/**"],
      exclude: ["**/*.test.*", "**/graphify-out/**", "**/*.md"],
    },
  },
});
