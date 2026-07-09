import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectCaller } from "../src/detect-caller.js";

// Shared cross-language fixtures (clients/caller-detection-cases.json), so this
// SDK's detector stays in lockstep with the CLI and the other SDKs.
const doc = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../caller-detection-cases.json", import.meta.url)), "utf8"),
) as { cases: { name: string; env: Record<string, string>; want: string }[] };

describe("detectCaller golden vectors", () => {
  for (const c of doc.cases) {
    it(c.name, () => {
      expect(detectCaller(c.env)).toBe(c.want);
    });
  }

  it("returns empty when there is no process.env (browser)", () => {
    const g = globalThis as { process?: unknown };
    const saved = g.process;
    g.process = undefined;
    try {
      expect(detectCaller()).toBe("");
    } finally {
      g.process = saved;
    }
  });

  it("returns empty for a browser polyfill (empty process.env, no versions.node)", () => {
    const g = globalThis as { process?: unknown };
    const saved = g.process;
    g.process = { env: {} }; // bundler polyfill — must NOT fall through to the shell default
    try {
      expect(detectCaller()).toBe("");
    } finally {
      g.process = saved;
    }
  });
});
