import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { EmailEvent, WebhookEventType } from "../src/index.js";

// The two properties the open-enum retype exists to hold. Both are type-level, so
// the compile-time half is asserted by tsc over this file (the `lint` script) and
// the runtime half only guards the generated text.
describe("open enum field types", () => {
  it("accepts a value the spec does not know yet", () => {
    // A server can add an event type without a client release. If this stops
    // compiling, the retype has closed the enum and broken forward compatibility.
    const future: EmailEvent["type"] = "email.invented_in_2030";
    const futureTopLevel: WebhookEventType = "channel.invented_in_2030";
    expect(future).toBe("email.invented_in_2030");
    expect(futureTopLevel).toBe("channel.invented_in_2030");
  });

  it("accepts the known values", () => {
    const known: EmailEvent["type"] = "email.bounced";
    expect(known).toBe("email.bounced");
  });

  // The literals are what an editor completes; `(string & {})` is what keeps the
  // union from collapsing back to plain `string` and erasing them. A naive
  // `| string` type-checks identically to this one, so only the generated text can
  // tell the two apart — hence the source assertion rather than a type assertion.
  it("keeps the literals alongside an open catch-all", () => {
    const types = readFileSync("src/generated/types.gen.ts", "utf8");
    const decl = types.match(/export type EmailEventType =([^;]*);/)?.[1];
    expect(decl, "EmailEventType declaration").toBeDefined();
    expect(decl).toContain('"email.bounced"');
    expect(decl).toContain("(string & {})");
    expect(decl, "a bare `| string` member would erase every literal").not.toMatch(
      /\|\s*string\s*(\||;|$)/,
    );
  });
});
