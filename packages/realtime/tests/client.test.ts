import { describe, expect, it, vi } from "vitest";
import { BirdRealtime } from "../src/client.js";
import type { WebSocketLike } from "../src/connection.js";
import type { Authorizer, MemberAuthorizer } from "../src/types.js";
import { encode } from "../src/protocol.js";

/** A fake WebSocket the test drives: records sent frames, exposes handlers. */
class FakeSocket implements WebSocketLike {
  sent: string[] = [];
  onopen: ((ev?: unknown) => void) | null = null;
  onclose: ((ev: { code: number; reason?: string }) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  closed = false;
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closed = true;
  }
  // Test helpers.
  deliver(event: string, data?: unknown, channel?: string): void {
    this.onmessage?.({ data: encode({ event, channel, data }) });
  }
  sentEvents(): string[] {
    return this.sent.map((s) => JSON.parse(s).event as string);
  }
  subscribesFor(channel: string): number {
    return this.sent
      .map(
        (s) => JSON.parse(s) as { event: string; data?: { channel?: string } },
      )
      .filter(
        (f) => f.event === "bird:subscribe" && f.data?.channel === channel,
      ).length;
  }
}

/** One client over a socket factory that records every socket it mints. */
function client(
  extra: { authorizer?: Authorizer; memberAuthorizer?: MemberAuthorizer } = {},
) {
  const sockets: FakeSocket[] = [];
  const bird = new BirdRealtime({
    appKey: "app-key",
    region: "us1",
    ...extra,
    webSocket: () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
  });
  return { bird, sockets };
}

function handshake(socket: FakeSocket, connectionId = "77.1") {
  socket.onopen?.();
  socket.deliver("bird:connection_established", {
    connection_id: connectionId,
    activity_timeout: 120,
  });
}

function connectedClient(
  extra: { authorizer?: Authorizer; memberAuthorizer?: MemberAuthorizer } = {},
) {
  const { bird, sockets } = client(extra);
  handshake(sockets[0]!);
  return { bird, socket: sockets[0]!, sockets };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("BirdRealtime", () => {
  it("derives the region edge URL and completes the handshake", () => {
    const { bird } = connectedClient();
    expect(bird.connection.state).toBe("connected");
    expect(bird.connection.connectionId).toBe("77.1");
  });

  it("subscribes a public channel and delivers events to bindings", async () => {
    const { bird, socket } = connectedClient();
    const channel = bird.subscribe("orders");
    const received: unknown[] = [];
    channel.bind("order-updated", (d) => received.push(d));

    await tick();
    expect(socket.sentEvents()).toContain("bird:subscribe");
    expect(JSON.parse(socket.sent.at(-1)!).data).toEqual({ channel: "orders" });

    socket.deliver("bird_internal:subscription_succeeded", {}, "orders");
    expect(channel.subscribed).toBe(true);

    socket.deliver("order-updated", { id: 42 }, "orders");
    expect(received).toEqual([{ id: 42 }]);
  });

  it("does not deliver internal frames as app events", async () => {
    const { bird, socket } = connectedClient();
    const channel = bird.subscribe("orders");
    let leaked = false;
    channel.bindGlobal((_d, event) => {
      if (event === "bird_internal:subscription_succeeded") leaked = true;
    });
    await tick();
    socket.deliver("bird_internal:subscription_succeeded", {}, "orders");
    expect(leaked).toBe(false);
  });

  it("rejects non-client-prefixed trigger events", async () => {
    const { bird, socket } = connectedClient();
    const channel = bird.subscribe("orders");
    await tick();
    socket.deliver("bird_internal:subscription_succeeded", {}, "orders");
    expect(() => channel.trigger("not-a-client-event")).toThrow(/client-/);
  });

  it("fails loudly on a handshake without connection_id", () => {
    const { bird, sockets } = client();
    const errors: unknown[] = [];
    bird.connection.bind("error", (e) => errors.push(e));
    sockets[0]!.onopen?.();
    sockets[0]!.deliver("bird:connection_established", { socket_id: "1.2" }); // legacy handshake
    expect(bird.connection.state).not.toBe("connected");
    expect(sockets[0]!.closed).toBe(true);
    expect(JSON.stringify(errors)).toContain("connection_id");

    // A real socket delivers the close this side asked for; the refusal is
    // already explained, so it must not be reported a second time.
    sockets[0]!.onclose?.({
      code: 4001,
      reason: "handshake missing connection_id",
    });
    expect(errors).toHaveLength(1);
    expect(bird.connection.state).toBe("failed");
  });

  it("speaks the member dialect on presence channels", async () => {
    const memberData = JSON.stringify({
      member_id: "alice",
      member_info: { name: "Alice" },
    });
    const { bird, socket } = connectedClient({
      authorizer: async ({ connectionId, channelName }) => ({
        auth: `key:sig-${connectionId}-${channelName}`,
        member_data: memberData,
      }),
    });

    const room = bird.subscribe("presence-room"); // typed PresenceChannel via overload
    await tick();

    const sub = JSON.parse(socket.sent.at(-1)!) as {
      event: string;
      data: Record<string, unknown>;
    };
    expect(sub.event).toBe("bird:subscribe");
    expect(sub.data.auth).toBe("key:sig-77.1-presence-room");
    expect(sub.data.member_data).toBe(memberData);
    expect(sub.data.channel_data).toBeUndefined(); // legacy blob key is never sent

    expect(room.myId).toBeNull(); // not until the server confirms
    socket.deliver(
      "bird_internal:subscription_succeeded",
      {
        presence: {
          count: 1,
          ids: ["alice"],
          hash: { alice: { name: "Alice" } },
        },
      },
      "presence-room",
    );
    expect(room.myId).toBe("alice");
    expect(room.members.get("alice")).toEqual({
      member_id: "alice",
      member_info: { name: "Alice" },
    });

    const joined: unknown[] = [];
    room.bind("bird:member_added", (m) => joined.push(m));
    socket.deliver(
      "bird_internal:member_added",
      { member_id: "bob", member_info: { name: "Bob" } },
      "presence-room",
    );
    expect(joined).toEqual([
      { member_id: "bob", member_info: { name: "Bob" } },
    ]);

    const counts: unknown[] = [];
    room.bind("bird:connection_count", (d) => counts.push(d));
    socket.deliver(
      "bird_internal:connection_count",
      { connection_count: 5 },
      "presence-room",
    );
    expect(counts).toEqual([{ connection_count: 5 }]);
  });
});

describe("reconnect lifecycle", () => {
  it("re-subscribes every channel with fresh auth on a real reconnect", async () => {
    const authCalls: string[] = [];
    const { bird, sockets } = client({
      authorizer: async ({ connectionId, channelName }) => {
        authCalls.push(connectionId);
        return { auth: `key:sig-${connectionId}-${channelName}` };
      },
    });
    handshake(sockets[0]!, "77.1");
    bird.subscribe("orders");
    bird.subscribe("private-a");
    await tick();
    sockets[0]!.deliver("bird_internal:subscription_succeeded", {}, "orders");
    sockets[0]!.deliver(
      "bird_internal:subscription_succeeded",
      {},
      "private-a",
    );

    // Socket 1 dies with a retry-immediately code; socket 2 handshakes with a NEW id.
    sockets[0]!.onclose?.({ code: 4201 });
    expect(bird.channel("orders")!.subscribed).toBe(false); // reset on drop
    await tick(); // reconnect timer (delay 0)
    expect(sockets).toHaveLength(2);
    handshake(sockets[1]!, "88.2");
    await tick();

    expect(sockets[1]!.subscribesFor("orders")).toBe(1);
    expect(sockets[1]!.subscribesFor("private-a")).toBe(1);
    const lastAuth = JSON.parse(
      sockets[1]!.sent.find((s) => s.includes("private-a"))!,
    ) as {
      data: { auth: string };
    };
    expect(lastAuth.data.auth).toBe("key:sig-88.2-private-a"); // fresh auth, new id
    expect(authCalls.filter((id) => id === "88.2")).toHaveLength(1);
  });

  it("drops a subscribe whose auth was signed for a previous connection", async () => {
    let release!: (v: { auth: string }) => void;
    const gate = new Promise<{ auth: string }>((res) => (release = res));
    let calls = 0;
    const { bird, sockets } = client({
      authorizer: ({ connectionId }) => {
        calls += 1;
        // First attempt (old socket) blocks; the reconnect's attempt resolves.
        return calls === 1
          ? gate
          : Promise.resolve({ auth: `key:sig-${connectionId}` });
      },
    });
    handshake(sockets[0]!, "77.1");
    bird.subscribe("private-slow");
    // The connection recycles while authorize is still in flight.
    sockets[0]!.onclose?.({ code: 4201 });
    await tick();
    handshake(sockets[1]!, "88.2");
    await tick();
    release({ auth: "key:signed-over-77.1" });
    await tick();

    const stale = sockets[1]!.sent.filter((s) =>
      s.includes("signed-over-77.1"),
    );
    expect(stale).toEqual([]); // the late continuation was invalidated
    expect(sockets[1]!.subscribesFor("private-slow")).toBe(1); // only the fresh one
  });

  it("connect() during a scheduled reconnect opens exactly one new socket", () => {
    vi.useFakeTimers();
    try {
      const { bird, sockets } = client();
      handshake(sockets[0]!);
      sockets[0]!.onclose?.({ code: 1006 }); // schedules a backoff reconnect
      expect(bird.connection.state).toBe("unavailable");

      bird.connect(); // user reconnects immediately
      expect(sockets.length).toBe(2);

      vi.advanceTimersByTime(60_000); // old timer must not fire a third open
      expect(sockets.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("subscribe lifecycle", () => {
  it("repeated subscribe calls send exactly one subscribe frame", async () => {
    const { bird, socket } = connectedClient();
    bird.subscribe("orders");
    bird.subscribe("orders"); // while the first is in flight
    await tick();
    bird.subscribe("orders"); // while pending
    socket.deliver("bird_internal:subscription_succeeded", {}, "orders");
    bird.subscribe("orders"); // after success
    await tick();
    expect(socket.subscribesFor("orders")).toBe(1);
  });

  it("a connection-level error is not attributed to a channel, and does not wedge retries", async () => {
    const { bird, socket } = connectedClient();
    const channel = bird.subscribe("orders");
    const chErrors: unknown[] = [];
    channel.bind("bird:subscription_error", (e) => chErrors.push(e));
    await tick();

    // A server rejection arrives with no channel field — not routable.
    socket.deliver("bird:error", { code: null, message: "Invalid signature" });
    expect(chErrors).toEqual([]); // never fabricated into a channel failure

    bird.subscribe("orders"); // ...but a retry is possible immediately
    await tick();
    expect(socket.subscribesFor("orders")).toBe(2);
  });

  it("an unrelated error does not disturb a subscribed channel", async () => {
    const memberData = JSON.stringify({ member_id: "alice", member_info: {} });
    const { bird, socket } = connectedClient({
      authorizer: async () => ({ auth: "key:sig", member_data: memberData }),
    });
    const room = bird.subscribe("presence-room");
    await tick();
    socket.deliver(
      "bird_internal:subscription_succeeded",
      { presence: { count: 1, ids: ["alice"], hash: { alice: {} } } },
      "presence-room",
    );
    expect(room.myId).toBe("alice");

    socket.deliver("bird:error", {
      code: null,
      message: "client event rate limit",
    });
    expect(room.subscribed).toBe(true); // untouched
    expect(room.myId).toBe("alice");
    expect(room.members.size).toBe(1);
  });

  it("an error during authorize never sends the late subscribe", async () => {
    let release!: (v: { auth: string }) => void;
    const gate = new Promise<{ auth: string }>((res) => (release = res));
    const { bird, socket } = connectedClient({ authorizer: () => gate });

    bird.subscribe("private-denied");
    socket.deliver("bird:error", { code: null, message: "rejected" }); // invalidates the attempt
    release({ auth: "key:sig" });
    await tick();

    expect(socket.subscribesFor("private-denied")).toBe(0);
  });

  it("an unsubscribe during authorize wins over the in-flight subscribe", async () => {
    let release!: (v: { auth: string }) => void;
    const gate = new Promise<{ auth: string }>((res) => (release = res));
    const { bird, socket } = connectedClient({ authorizer: () => gate });

    bird.subscribe("private-gone");
    bird.unsubscribe("private-gone"); // races the auth round-trip
    release({ auth: "key:sig" });
    await tick();

    expect(socket.subscribesFor("private-gone")).toBe(0);
  });

  it("a channel-scoped subscription_error frame fails the channel (forward-compat)", async () => {
    const { bird, socket } = connectedClient();
    const channel = bird.subscribe("orders");
    const errors: unknown[] = [];
    channel.bind("bird:subscription_error", (e) => errors.push(e));
    await tick();

    // Synthetic: the server does not emit this today, but a channel-scoped
    // rejection must reach the channel lifecycle rather than be swallowed.
    socket.deliver(
      "bird_internal:subscription_error",
      { message: "denied" },
      "orders",
    );
    expect(errors).toEqual([{ message: "denied" }]);
    expect(channel.subscribed).toBe(false);

    bird.subscribe("orders"); // and retry works after the failure
    await tick();
    expect(socket.subscribesFor("orders")).toBe(2);
  });

  it("a stale authorize cannot clobber a newer attempt's pending identity", async () => {
    // Two overlapping authorizes for one presence channel: the first (stale)
    // resolves LAST with a different member_id. The state machine must take
    // the winning attempt's identity, not the stale one's.
    const gates: Array<(v: { auth: string; member_data: string }) => void> = [];
    const { bird, socket } = connectedClient({
      authorizer: () =>
        new Promise((res) => {
          gates.push(res);
        }),
    });
    const room = bird.subscribe("presence-room");
    await tick();
    // A connection-level error invalidates the first attempt mid-authorize…
    socket.deliver("bird:error", { code: null, message: "transient" });
    bird.subscribe("presence-room"); // …and the user retries (attempt 2)
    await tick();
    expect(gates).toHaveLength(2);

    // Attempt 2 (fresh) resolves first, as bob.
    gates[1]!({
      auth: "key:sig-2",
      member_data: JSON.stringify({ member_id: "bob", member_info: {} }),
    });
    await tick();
    // Attempt 1 (stale) resolves last, as alice — and must be dropped.
    gates[0]!({
      auth: "key:sig-1",
      member_data: JSON.stringify({ member_id: "alice", member_info: {} }),
    });
    await tick();

    expect(socket.subscribesFor("presence-room")).toBe(1); // only the fresh subscribe
    socket.deliver(
      "bird_internal:subscription_succeeded",
      { presence: { count: 1, ids: ["bob"], hash: { bob: {} } } },
      "presence-room",
    );
    expect(room.myId).toBe("bob"); // not clobbered to "alice"
  });

  it("a failed authorizer emits bird:subscription_error and allows retry", async () => {
    let attempt = 0;
    const { bird, socket } = connectedClient({
      authorizer: () => {
        attempt += 1;
        return attempt === 1
          ? Promise.reject(new Error("auth endpoint down"))
          : Promise.resolve({ auth: "key:sig" });
      },
    });
    const channel = bird.subscribe("private-x");
    const errors: unknown[] = [];
    channel.bind("bird:subscription_error", (e) => errors.push(e));
    await tick();
    expect(errors).toHaveLength(1);

    bird.subscribe("private-x"); // retry after failure
    await tick();
    expect(socket.subscribesFor("private-x")).toBe(1);
  });
  it("signs in the member and resolves with the signed identity", async () => {
    const memberData = JSON.stringify({
      member_id: "member-7",
      member_info: { name: "Ada" },
    });
    const { bird, socket } = connectedClient({
      memberAuthorizer: () =>
        Promise.resolve({ auth: "key:sig", member_data: memberData }),
    });

    const pending = bird.signin();
    await tick();
    const frame = JSON.parse(socket.sent.at(-1)!) as {
      event: string;
      data: { auth: string; member_data: string };
    };
    expect(frame.event).toBe("bird:signin");
    expect(frame.data).toEqual({ auth: "key:sig", member_data: memberData });

    socket.deliver("bird:signin_success", { member_data: memberData });
    await expect(pending).resolves.toEqual({
      member_id: "member-7",
      member_info: { name: "Ada" },
    });
    expect(bird.signedInMember?.member_id).toBe("member-7");
  });

  it("signs in again on a new connection, with that connection's id", async () => {
    const seen: string[] = [];
    const memberData = JSON.stringify({ member_id: "member-7" });
    const { bird, socket, sockets } = connectedClient({
      memberAuthorizer: ({ connectionId }) => {
        seen.push(connectionId);
        return Promise.resolve({ auth: "key:sig", member_data: memberData });
      },
    });

    const pending = bird.signin();
    await tick();
    socket.deliver("bird:signin_success", { member_data: memberData });
    await pending;

    bird.disconnect();
    expect(bird.signedInMember).toBeNull();
    bird.connect();
    handshake(sockets[1]!, "77.2");
    await tick();

    expect(seen).toEqual(["77.1", "77.2"]);
    expect(sockets[1]!.sentEvents()).toContain("bird:signin");
  });

  it("rejects signin when the member authorizer fails", async () => {
    const { bird } = connectedClient({
      memberAuthorizer: () => Promise.reject(new Error("member auth down")),
    });

    await expect(bird.signin()).rejects.toThrow("member auth down");
    expect(bird.signedInMember).toBeNull();
  });

  it("rejects signin when the server refuses it", async () => {
    const { bird, socket } = connectedClient({
      memberAuthorizer: () =>
        Promise.resolve({
          auth: "key:sig",
          member_data: JSON.stringify({ member_id: "member-7" }),
        }),
    });

    const pending = bird.signin();
    await tick();
    socket.deliver("bird:error", { code: null, message: "Invalid signature" });
    await expect(pending).rejects.toThrow("Invalid signature");
  });

  it("subscribes the member channel once signed in and delivers its events", async () => {
    const memberData = JSON.stringify({ member_id: "member-7" });
    const { bird, socket } = connectedClient({
      memberAuthorizer: () =>
        Promise.resolve({ auth: "key:sig", member_data: memberData }),
    });

    const pending = bird.signin();
    await tick();
    socket.deliver("bird:signin_success", { member_data: memberData });
    await pending;
    await tick();

    // The subscribe carries no auth payload: the edge authorizes this channel by
    // the signed-in identity, not a signature.
    const subscribe = socket.sent
      .map(
        (raw) =>
          JSON.parse(raw) as { event: string; data?: Record<string, unknown> },
      )
      .find(
        (f) =>
          f.event === "bird:subscribe" &&
          String(f.data?.channel).startsWith("#server-to-user-"),
      );
    expect(subscribe?.data).toEqual({ channel: "#server-to-user-member-7" });

    const received: unknown[] = [];
    bird.member.bind("order.shipped", (d) => received.push(d));
    socket.deliver(
      "bird_internal:subscription_succeeded",
      {},
      "#server-to-user-member-7",
    );
    socket.deliver("order.shipped", { id: 42 }, "#server-to-user-member-7");

    expect(received).toEqual([{ id: 42 }]);
  });

  it("keeps protocol frames off the member emitter", async () => {
    const memberData = JSON.stringify({ member_id: "member-7" });
    const { bird, socket } = connectedClient({
      memberAuthorizer: () =>
        Promise.resolve({ auth: "key:sig", member_data: memberData }),
    });
    const pending = bird.signin();
    await tick();
    socket.deliver("bird:signin_success", { member_data: memberData });
    await pending;
    await tick();

    const seen: string[] = [];
    bird.member.bindGlobal((_d, event) => seen.push(String(event)));
    const channel = "#server-to-user-member-7";
    socket.deliver("bird_internal:subscription_succeeded", {}, channel);
    socket.deliver(
      "bird_internal:connection_count",
      { connection_count: 2 },
      channel,
    );
    socket.deliver("payment.failed", { id: 1 }, channel);

    expect(seen).toEqual(["payment.failed"]);
  });

  it("does not deliver another member's events", async () => {
    const memberData = JSON.stringify({ member_id: "member-7" });
    const { bird, socket } = connectedClient({
      memberAuthorizer: () =>
        Promise.resolve({ auth: "key:sig", member_data: memberData }),
    });
    const pending = bird.signin();
    await tick();
    socket.deliver("bird:signin_success", { member_data: memberData });
    await pending;
    await tick();

    const received: unknown[] = [];
    bird.member.bind("order.shipped", (d) => received.push(d));
    // A frame for a different member's reserved channel: not ours, so it must
    // not reach our emitter even though the event name matches.
    socket.deliver("order.shipped", { id: 9 }, "#server-to-user-member-8");

    expect(received).toEqual([]);
  });

  it("re-subscribes the member channel on the next connection's signin", async () => {
    const memberData = JSON.stringify({ member_id: "member-7" });
    const { bird, socket, sockets } = connectedClient({
      memberAuthorizer: () =>
        Promise.resolve({ auth: "key:sig", member_data: memberData }),
    });
    const pending = bird.signin();
    await tick();
    socket.deliver("bird:signin_success", { member_data: memberData });
    await pending;
    await tick();

    bird.disconnect();
    // The old channel is forgotten with the connection, so a late frame on it
    // cannot reach the emitter.
    const received: unknown[] = [];
    bird.member.bind("order.shipped", (d) => received.push(d));
    socket.deliver("order.shipped", { id: 1 }, "#server-to-user-member-7");
    expect(received).toEqual([]);

    bird.connect();
    handshake(sockets[1]!, "77.2");
    await tick();
    sockets[1]!.deliver("bird:signin_success", { member_data: memberData });
    await tick();

    expect(sockets[1]!.subscribesFor("#server-to-user-member-7")).toBe(1);
    sockets[1]!.deliver(
      "bird_internal:subscription_succeeded",
      {},
      "#server-to-user-member-7",
    );
    sockets[1]!.deliver("order.shipped", { id: 2 }, "#server-to-user-member-7");
    expect(received).toEqual([{ id: 2 }]);
  });

  it("reports a failed re-signin as signin_error, with no promise to reject", async () => {
    let attempt = 0;
    const memberData = JSON.stringify({ member_id: "member-7" });
    const { bird, socket, sockets } = connectedClient({
      memberAuthorizer: () => {
        attempt += 1;
        return attempt === 1
          ? Promise.resolve({ auth: "key:sig", member_data: memberData })
          : Promise.reject(new Error("session revoked"));
      },
    });

    const pending = bird.signin();
    await tick();
    socket.deliver("bird:signin_success", { member_data: memberData });
    await pending;

    const signinErrors: Array<{ message?: string }> = [];
    const errors: unknown[] = [];
    bird.connection.bind("signin_error", (e) =>
      signinErrors.push(e as { message?: string }),
    );
    bird.connection.bind("error", (e) => errors.push(e));
    bird.disconnect();
    bird.connect();
    handshake(sockets[1]!, "77.2");
    await tick();

    expect(signinErrors.map((e) => e.message)).toEqual(["session revoked"]);
    // Never on `error`: that path cancels every channel's in-flight authorize.
    expect(errors).toEqual([]);
    expect(bird.signedInMember).toBeNull();
  });

  it("a failed re-signin leaves channel resubscribes alone", async () => {
    // The reported regression: after a reconnect, subscribeAll() and
    // sendSignin() run together, so a member-auth failure that surfaced on the
    // connection's `error` cancelled the channel authorization in flight.
    const memberData = JSON.stringify({ member_id: "member-7" });
    const channelGates: Array<(v: { auth: string }) => void> = [];
    let memberAttempt = 0;
    const { bird, socket, sockets } = connectedClient({
      authorizer: () =>
        new Promise((resolve) => {
          channelGates.push(resolve);
        }),
      memberAuthorizer: () => {
        memberAttempt += 1;
        return memberAttempt === 1
          ? Promise.resolve({ auth: "key:sig", member_data: memberData })
          : Promise.reject(new Error("member auth down"));
      },
    });

    const pending = bird.signin();
    bird.subscribe("private-orders");
    await tick();
    socket.deliver("bird:signin_success", { member_data: memberData });
    channelGates[0]!({ auth: "key:chan-sig" });
    await pending;
    await tick();
    expect(socket.subscribesFor("private-orders")).toBe(1);

    // Reconnect: the channel re-authorizes while the re-signin fails with no
    // promise waiting on it.
    bird.disconnect();
    bird.connect();
    handshake(sockets[1]!, "77.2");
    await tick();
    expect(channelGates).toHaveLength(2);
    channelGates[1]!({ auth: "key:chan-sig-2" });
    await tick();

    expect(sockets[1]!.subscribesFor("private-orders")).toBe(1);
  });

  it("ignores an authorizer rejection that lands after a reconnect", async () => {
    const gates: Array<(e: Error) => void> = [];
    const { bird, sockets } = connectedClient({
      memberAuthorizer: () =>
        new Promise((_resolve, reject) => {
          gates.push(reject);
        }),
    });

    bird.signin().catch(() => {});
    await tick();

    const signinErrors: unknown[] = [];
    bird.connection.bind("signin_error", (e) => signinErrors.push(e));
    bird.disconnect();
    bird.connect();
    handshake(sockets[1]!, "77.2");
    await tick();

    // The first connection's authorization finally fails, long after its
    // connection went away: it belongs to nobody now.
    gates[0]!(new Error("stale failure"));
    await tick();
    expect(signinErrors).toEqual([]);
  });

  it("surfaces the 4009 close when the API terminates the member", async () => {
    const { bird, socket } = connectedClient();
    const errors: Array<{ code?: number | null; message?: string }> = [];
    bird.connection.bind("error", (e) =>
      errors.push(e as { code?: number | null; message?: string }),
    );

    socket.onclose?.({ code: 4009, reason: "Member connections terminated" });

    expect(errors).toEqual([
      { code: 4009, message: "Member connections terminated" },
    ]);
    expect(bird.connection.state).toBe("failed");
  });
});
