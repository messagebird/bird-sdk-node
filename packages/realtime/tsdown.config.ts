import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "tsdown";
import { readFileSync } from "node:fs";

// TypeScript 7's tsc binary via pnpm's .bin symlink (same arrangement as the SDK).
const tscPath = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "node_modules/.bin/tsc",
);

// The published version, injected as the literal `__SDK_VERSION__` (see below).
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

// Single ESM bundle for the browser. Native WebSocket + fetch, no polyfills, no
// Node built-ins — the whole client is browser-first and tree-shakeable.
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
  platform: "neutral",
  // `platform: neutral` switches tsdown's ESM output extension to `.js`; pin it
  // back to `.mjs`/`.d.mts` so the entry points match the SDK's convention.
  fixedExtension: true,
  // The published version, injected as the literal `__SDK_VERSION__` so the
  // handshake query stays in lockstep with package.json — no second copy to
  // forget on a release bump (same arrangement as the SDK).
  define: { __SDK_VERSION__: JSON.stringify(version) },
});
