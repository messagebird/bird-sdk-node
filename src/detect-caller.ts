import { callerRules, callerBooleanishSkip, callerDefault } from "./caller-rules.gen.js";

/**
 * Infers the environment driving the SDK for the `Bird-Caller` usage-telemetry
 * label by walking the generated rules in order (single source of truth:
 * `clients/caller-detection.yaml`, shared with the CLI and the other SDKs).
 * Best-effort and non-authoritative — it only labels traffic, never gates
 * behavior.
 *
 * Edge-safe: `process` is read only through a `typeof`-style `globalThis` guard,
 * so on a browser (no `process.env`) it returns `""` and the client sends no
 * `Bird-Caller` header. `env` is injected in tests.
 */
export function detectCaller(env?: Record<string, string | undefined>): string {
  // Tests / explicit callers pass `env`. Otherwise derive it from a *real* Node
  // process only: a browser — including one whose bundler polyfills an empty
  // `process.env` — has no agent, so we return "" (no header) rather than falling
  // through to the shell default. A genuine Node process always sets
  // `process.versions.node`; polyfills do not.
  let source = env;
  if (source === undefined) {
    const proc = (
      globalThis as {
        process?: { env?: Record<string, string | undefined>; versions?: { node?: string } };
      }
    ).process;
    if (proc?.versions?.node === undefined) return "";
    source = proc.env ?? {};
  }
  for (const rule of callerRules) {
    const value = source[rule.env];
    if (value === undefined || value === "" || (rule.equals !== undefined && value !== rule.equals)) {
      continue;
    }
    if (!rule.passthrough) return rule.name as string;
    const sanitized = sanitizeCaller(value);
    if (sanitized) return sanitized;
  }
  return callerDefault;
}

// Lowercases and bounds a passthrough (AGENT=<name>) value the same charset+length
// way as the other Bird-* labels, dropping boolean-ish values that carry no
// harness identity (e.g. OpenCode sets AGENT=1).
function sanitizeCaller(value: string): string {
  const s = value.trim().toLowerCase();
  if (s === "" || s.length > 32 || callerBooleanishSkip.has(s)) return "";
  return /^[a-z0-9._-]+$/.test(s) ? s : "";
}
