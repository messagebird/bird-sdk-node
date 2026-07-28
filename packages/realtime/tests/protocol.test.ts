import { describe, expect, it } from "vitest";
import {
  decode,
  encode,
  Inbound,
  isInternal,
  Outbound,
  SYSTEM,
} from "../src/protocol.js";

describe("protocol", () => {
  it("speaks the bird: namespace", () => {
    expect(SYSTEM).toBe("bird:");
    expect(Outbound.Subscribe).toBe("bird:subscribe");
    expect(Inbound.ConnectionEstablished).toBe("bird:connection_established");
    expect(Inbound.SubscriptionSucceeded).toBe(
      "bird_internal:subscription_succeeded",
    );
    expect(Inbound.ConnectionCount).toBe("bird_internal:connection_count");
  });

  it("encodes outbound data as a JSON value (the edge rejects stringified hashes)", () => {
    const raw = encode({
      event: "bird:subscribe",
      data: { channel: "orders" },
    });
    expect(JSON.parse(raw)).toEqual({
      event: "bird:subscribe",
      data: { channel: "orders" },
    });
  });

  it("decodes a double-encoded data payload back to a value", () => {
    const frame = decode(
      JSON.stringify({
        event: "order-updated",
        channel: "orders",
        data: '{"id":42}',
      }),
    );
    expect(frame).toEqual({
      event: "order-updated",
      channel: "orders",
      data: { id: 42 },
    });
  });

  it("returns null for a non-frame message", () => {
    expect(decode("not json")).toBeNull();
    expect(decode(JSON.stringify({ no: "event" }))).toBeNull();
  });

  it("classifies internal events", () => {
    expect(isInternal("bird_internal:member_added")).toBe(true);
    expect(isInternal("order-updated")).toBe(false);
  });
});
