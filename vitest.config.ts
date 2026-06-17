import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Mirror tsup's `define` so tests see the real package version in `__SDK_VERSION__`.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  define: { __SDK_VERSION__: JSON.stringify(version) },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
