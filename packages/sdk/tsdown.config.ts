import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "tsdown";

// TypeScript 7's tsc binary via pnpm's .bin symlink.
const tscPath = resolve(fileURLToPath(new URL(".", import.meta.url)), "node_modules/.bin/tsc");

// The published version, injected as the literal `__SDK_VERSION__` so the
// User-Agent in client.ts stays in lockstep with package.json — no second copy
// to forget on a release bump. vitest.config.ts defines the same constant.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Bundle to a single ESM entry. Raw `tsc` can't ship this package: the generated
// hey-api client uses extensionless relative imports, which Node ESM refuses to
// resolve (ERR_MODULE_NOT_FOUND). Bundling inlines all internal modules so the
// published artifact has no unresolved relative imports. `standardwebhooks` (the
// only runtime dependency) stays external — tsdown externalizes package.json deps.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    // TS 7's tsc is the Go binary. Pointing tsgo here makes rolldown-plugin-dts
    // use `tsc --declaration --emitDeclarationOnly --noCheck` instead of the JS
    // programmatic API, which has no stable surface in TypeScript 7.
    tsgo: { path: tscPath },
  },
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  define: { __SDK_VERSION__: JSON.stringify(version) },
});
