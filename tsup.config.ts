import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

// The published version, injected as the literal `__SDK_VERSION__` so the
// User-Agent in client.ts stays in lockstep with package.json — no second copy
// to forget on a release bump. vitest.config.ts defines the same constant.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Bundle to a single ESM entry. Raw `tsc` can't ship this package: the generated
// hey-api client uses extensionless relative imports, which Node ESM refuses to
// resolve (ERR_MODULE_NOT_FOUND). Bundling inlines all internal modules so the
// published artifact has no unresolved relative imports. `standardwebhooks` (the
// only runtime dependency) stays external — tsup externalizes package.json deps.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  define: { __SDK_VERSION__: JSON.stringify(version) },
});
