import { describe, it, expect } from "vitest";
import { Webhook } from "standardwebhooks";
import { BirdClient } from "../../src/client.js";
import { BirdError, BirdWebhookVerificationError } from "../../src/index.js";
import type { BirdWebhookEvent } from "../../src/index.js";

// Example Standard Webhooks secret (whsec_ + base64).
const SECRET = "whsec_C2FVsBQIhrscChlQIMV+b5sSYspob7oD";

// Sign a payload the way Bird's substrate does, returning the delivery headers.
function signed(payload: string, secret = SECRET): Record<string, string> {
  const wh = new Webhook(secret);
  const id = "msg_2abc";
  const timestamp = new Date();
  return {
    "webhook-id": id,
    "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
    "webhook-signature": wh.sign(id, timestamp, payload),
  };
}

const bird = () => new BirdClient({ apiKey: "bk_eu1_x" });

describe("bird.webhooks.unwrap", () => {
  it("verifies a valid signature and returns the typed event", () => {
    const payload = JSON.stringify({
      type: "email.delivered",
      email_id: "em_1",
      recipient_id: "er_1",
      workspace_id: "ws_1",
      recipient: "a@b.com",
    });
    const event = bird().webhooks.unwrap(payload, signed(payload), { secret: SECRET });
    expect(event.type).toBe("email.delivered");
    if (event.type === "email.delivered") expect(event.email_id).toBe("em_1");
  });

  it("throws BirdWebhookVerificationError on a tampered signature", () => {
    const payload = JSON.stringify({ type: "email.delivered", data: {} });
    const headers = signed(payload);
    headers["webhook-signature"] = "v1,deadbeef";
    expect(() => bird().webhooks.unwrap(payload, headers, { secret: SECRET })).toThrow(BirdWebhookVerificationError);
  });

  it("throws when the payload was modified after signing", () => {
    const payload = JSON.stringify({ type: "email.delivered", data: {} });
    const headers = signed(payload);
    const tampered = JSON.stringify({ type: "email.delivered", data: { injected: true } });
    expect(() => bird().webhooks.unwrap(tampered, headers, { secret: SECRET })).toThrow(BirdWebhookVerificationError);
  });

  it("a verification failure is also a BirdError", () => {
    const headers = { "webhook-id": "x", "webhook-timestamp": "1", "webhook-signature": "v1,x" };
    expect(() => bird().webhooks.unwrap("{}", headers, { secret: SECRET })).toThrow(BirdError);
  });

  it("passes unknown event types through (forward-compatible)", () => {
    const payload = JSON.stringify({ type: "future.unknown_event", data: { x: 1 } });
    const event = bird().webhooks.unwrap(payload, signed(payload), { secret: SECRET });
    expect((event as { type: string }).type).toBe("future.unknown_event");
  });

  it("accepts a Headers object as well as a plain record", () => {
    const payload = JSON.stringify({ type: "email.delivered", data: {} });
    const event = bird().webhooks.unwrap(payload, new Headers(signed(payload)), { secret: SECRET });
    expect(event.type).toBe("email.delivered");
  });

  it("uses the client-level webhooks.secret when no per-call secret is given", () => {
    const payload = JSON.stringify({ type: "email.delivered", data: {} });
    const client = new BirdClient({ apiKey: "bk_eu1_x", webhooks: { secret: SECRET } });
    const event = client.webhooks.unwrap(payload, signed(payload));
    expect(event.type).toBe("email.delivered");
  });

  it("throws a clear error when no secret is configured anywhere", () => {
    const payload = JSON.stringify({ type: "email.delivered", data: {} });
    expect(() => bird().webhooks.unwrap(payload, signed(payload))).toThrow(/webhook secret/i);
  });
});

// Compile-time: the union is discriminated on `type` and narrows in a switch.
function _narrowing(event: BirdWebhookEvent) {
  if (event.type === "email.delivered") {
    const t: "email.delivered" = event.type;
    void t;
  }
}
void _narrowing;
