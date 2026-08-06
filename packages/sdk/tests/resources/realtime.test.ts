import { describe, it, expect } from "vitest";
import { BirdClient } from "../../src/client.js";

// End-to-end through the real stack (client → resource → core → generated SDK);
// only the transport `fetch` is faked.
function fakeFetch(responses: Array<() => Response>) {
  const calls: Request[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    calls.push(req);
    return responses[Math.min(calls.length - 1, responses.length - 1)]();
  }) as typeof fetch;
  return { fn, calls };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const APP = "rap_01krdgeqcxet5s7t44vh8rt9mg";

function bird(fn: typeof fetch, realtime?: { key?: string; secret?: string }) {
  return new BirdClient({ apiKey: "bk_eu1_test", fetch: fn, realtime });
}

describe("bird.realtime credentials", () => {
  it("sends the configured app key and secret as headers", async () => {
    const { fn, calls } = fakeFetch([() => json(200, { data: [] })]);

    await bird(fn, { key: "rk_live", secret: "rs_live" }).realtime.publish(APP, {
      event: "greeting",
      channels: ["orders"],
      data: { hello: "world" },
    });

    expect(calls[0].headers.get("X-Realtime-Key")).toBe("rk_live");
    expect(calls[0].headers.get("X-Realtime-Secret")).toBe("rs_live");
    // The workspace API key still authenticates the request itself.
    expect(calls[0].headers.get("Authorization")).toBe("Bearer bk_eu1_test");
  });

  // The app secret must reach ONLY the operations that declare the schemes. A
  // shared header path once put it on every request, so this pins the scope.
  it("does not send the app credentials on an unrelated resource", async () => {
    const { fn, calls } = fakeFetch([() => json(200, { id: "em_1" })]);

    await bird(fn, { key: "rk_live", secret: "rs_live" }).email.send({
      from: "hello@acme.com",
      to: ["customer@example.com"],
      subject: "hi",
      html: "<p>hi</p>",
    });

    expect(calls[0].headers.get("X-Realtime-Key")).toBeNull();
    expect(calls[0].headers.get("X-Realtime-Secret")).toBeNull();
    expect(calls[0].headers.get("Authorization")).toBe("Bearer bk_eu1_test");
  });

  it("a per-call key/secret overrides the client config", async () => {
    const { fn, calls } = fakeFetch([() => json(200, { data: [] })]);

    await bird(fn, { key: "rk_live", secret: "rs_live" }).realtime.channels.list(
      APP,
      undefined,
      { credentials: { RealtimeKey: "rk_other", RealtimeSecret: "rs_other" } },
    );

    expect(calls[0].headers.get("X-Realtime-Key")).toBe("rk_other");
    expect(calls[0].headers.get("X-Realtime-Secret")).toBe("rs_other");
  });

  it("throws before any request when no credentials are configured", async () => {
    const { fn, calls } = fakeFetch([() => json(200, {})]);
    const client = bird(fn);

    expect(() => client.realtime.publish(APP, { event: "x", channels: ["c"] })).toThrow(
      /is required for this operation/,
    );
    expect(() => client.realtime.members.disconnect(APP, "user_42")).toThrow(
      /is required for this operation/,
    );
    expect(calls).toHaveLength(0);
  });

  it("throws when only one half of the pair is set", () => {
    const { fn } = fakeFetch([() => json(200, {})]);
    expect(() => bird(fn, { key: "rk_live" }).realtime.channels.get(APP, "orders")).toThrow(
      /is required for this operation/,
    );
  });
});

describe("bird.realtime routes", () => {
  const creds = { key: "rk_live", secret: "rs_live" };

  it("publish POSTs the event body to the app's events path", async () => {
    const { fn, calls } = fakeFetch([() => json(200, { data: [{ name: "orders" }] })]);

    const result = await bird(fn, creds).realtime.publish(APP, {
      event: "order.updated",
      channels: ["orders"],
      data: { id: 1 },
      exclude_connection_id: "81721.1907241",
    });

    expect(result.data?.[0].name).toBe("orders");
    expect(calls[0].method).toBe("POST");
    expect(new URL(calls[0].url).pathname).toBe(`/v1/realtime/apps/${APP}/events`);
    await expect(calls[0].json()).resolves.toEqual({
      event: "order.updated",
      channels: ["orders"],
      data: { id: 1 },
      exclude_connection_id: "81721.1907241",
    });
  });

  it("publishBatch POSTs the events array to batch-events", async () => {
    const { fn, calls } = fakeFetch([() => json(200, { data: [] })]);

    await bird(fn, creds).realtime.publishBatch(APP, {
      events: [{ event: "created", channel: "orders", data: { id: 1 } }],
    });

    expect(new URL(calls[0].url).pathname).toBe(`/v1/realtime/apps/${APP}/batch-events`);
    await expect(calls[0].json()).resolves.toEqual({
      events: [{ event: "created", channel: "orders", data: { id: 1 } }],
    });
  });

  it("channels.list forwards prefix and include as query params", async () => {
    const { fn, calls } = fakeFetch([() => json(200, { data: [] })]);

    await bird(fn, creds).realtime.channels.list(APP, {
      prefix: "presence-",
      include: ["member_count"],
    });

    const url = new URL(calls[0].url);
    expect(calls[0].method).toBe("GET");
    expect(url.pathname).toBe(`/v1/realtime/apps/${APP}/channels`);
    expect(url.searchParams.get("prefix")).toBe("presence-");
    expect(url.searchParams.get("include")).toBe("member_count");
  });

  it("channels.get and channels.members put the channel name in the path", async () => {
    const { fn, calls } = fakeFetch([() => json(200, { occupied: true, members: [] })]);
    const client = bird(fn, creds);

    await client.realtime.channels.get(APP, "presence-lobby");
    await client.realtime.channels.members(APP, "presence-lobby");

    expect(new URL(calls[0].url).pathname).toBe(
      `/v1/realtime/apps/${APP}/channels/presence-lobby`,
    );
    expect(new URL(calls[1].url).pathname).toBe(
      `/v1/realtime/apps/${APP}/channels/presence-lobby/members`,
    );
  });

  it("members.send POSTs the event to the member's events path", async () => {
    const { fn, calls } = fakeFetch([() => new Response(null, { status: 204 })]);

    await bird(fn, creds).realtime.members.send(APP, "user_42", {
      event: "order-shipped",
      data: { order_id: "ord_123" },
    });

    expect(calls[0].method).toBe("POST");
    expect(new URL(calls[0].url).pathname).toBe(
      `/v1/realtime/apps/${APP}/members/user_42/events`,
    );
    // No channel is named anywhere: the member is the address, and the reserved
    // channel the edge delivers on is built server-side.
    await expect(calls[0].json()).resolves.toEqual({
      event: "order-shipped",
      data: { order_id: "ord_123" },
    });
  });

  it("members.disconnect is a bodyless POST on the member's disconnect path", async () => {
    const { fn, calls } = fakeFetch([() => new Response(null, { status: 204 })]);

    await bird(fn, creds).realtime.members.disconnect(APP, "user_42");

    expect(calls[0].method).toBe("POST");
    expect(new URL(calls[0].url).pathname).toBe(
      `/v1/realtime/apps/${APP}/members/user_42/disconnect`,
    );
  });
});
