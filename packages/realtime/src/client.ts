import { defaultAuthorizer, defaultMemberAuthorizer } from "./auth.js";
import {
  channelFor,
  PresenceChannel,
  PrivateChannel,
  type Channel,
} from "./channel.js";
import { Connection } from "./connection.js";
import { BirdRealtimeError } from "./errors.js";
import { Inbound, Outbound, type Frame } from "./protocol.js";
import type {
  Authorizer,
  MemberAuthorizer,
  Options,
  SignedInMember,
} from "./types.js";

// Injected by tsdown/vitest `define` from package.json, so there is no second
// version literal to forget on a release bump.
declare const __SDK_VERSION__: string;
export const VERSION = __SDK_VERSION__;

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Resolve the WebSocket URL from the region (or an explicit host). */
function resolveUrl(options: Options): string {
  let host = options.wsHost;
  if (!host) {
    if (!options.region) {
      throw new BirdRealtimeError(
        "BirdRealtime: `region` (or `wsHost`) is required.",
      );
    }
    host = `ws-${options.region}.realtime.platform.bird.com`;
  }
  // Plaintext only for loopback, and only on request — a copied config can't
  // silently downgrade real traffic. Bracketed IPv6 ([::1] or [::1]:port)
  // keeps its brackets as the hostname; otherwise the hostname ends at the
  // port colon.
  const hostname = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : (host.split(":")[0] ?? host);
  const scheme = options.allowInsecure && LOOPBACK.has(hostname) ? "ws" : "wss";
  const query = `protocol=7&client=realtime-js&version=${VERSION}`;
  return `${scheme}://${host}/app/${encodeURIComponent(options.appKey)}?${query}`;
}

/**
 * BirdRealtime is the browser client: it owns one connection and a set of
 * channels, (re)subscribing them whenever the connection is (re)established.
 *
 *   const bird = new BirdRealtime({ appKey: "app-key", region: "us1" });
 *   const channel = bird.subscribe("orders");
 *   channel.bind("order-updated", (data) => {});
 */
export class BirdRealtime {
  readonly connection: Connection;
  readonly appKey: string;
  private readonly channels = new Map<string, Channel>();
  private readonly authorizer: Authorizer;
  private readonly memberAuthorizer: MemberAuthorizer;
  // Signin is per connection, so `member` is dropped whenever the connection
  // is, while `signinArmed` survives to re-sign in on the next one.
  private signinArmed = false;
  private member: SignedInMember | null = null;
  private signinWaiters: Array<{
    resolve: (member: SignedInMember) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(options: Options) {
    this.appKey = options.appKey;
    this.authorizer =
      options.authorizer ??
      defaultAuthorizer(
        options.authEndpoint ?? "/bird/auth",
        options.authHeaders,
        options.allowCrossOriginAuth,
      );

    this.memberAuthorizer =
      options.memberAuthorizer ??
      defaultMemberAuthorizer(
        options.memberAuthEndpoint ?? "/bird/auth/member",
        options.authHeaders,
        options.allowCrossOriginAuth,
      );

    this.connection = new Connection(resolveUrl(options), {
      activityTimeout: options.activityTimeout,
      pongTimeout: options.pongTimeout,
      webSocket: options.webSocket,
    });
    this.connection.bind("connected", () => {
      this.subscribeAll();
      if (this.signinArmed) void this.sendSignin();
    });
    this.connection.bind("message", (frame) => this.route(frame as Frame));
    // Server subscribe rejections arrive as connection-level bird:error frames
    // with no channel field, so they cannot be attributed to one channel —
    // bind `connection.on("error")` for them. They do invalidate in-flight
    // attempts so subscribe() can retry instead of being wedged.
    this.connection.bind("error", (payload) => {
      for (const channel of this.channels.values()) channel.invalidateAttempt();
      // A rejected signin arrives as a channel-less error too, so a pending
      // signin() can only be failed on the connection's error, not attributed.
      const { message } = (payload ?? {}) as { message?: string };
      this.failSignin(
        new BirdRealtimeError(message ?? "Realtime connection error"),
      );
    });
    // A dropped connection drops every subscription with it; channels stay
    // registered and re-subscribe on the next `connected`.
    this.connection.bind("state_change", (change) => {
      const { current } = change as { current: string };
      if (
        current === "unavailable" ||
        current === "disconnected" ||
        current === "failed"
      ) {
        for (const channel of this.channels.values()) channel.reset();
        this.member = null;
        this.failSignin(
          new BirdRealtimeError("Connection lost before signin completed"),
        );
      }
    });
    this.connection.connect();
  }

  /**
   * Subscribe to a channel (idempotent — an already-subscribed or in-flight
   * channel is returned as-is). The type follows the name prefix.
   */
  subscribe(name: `presence-${string}`): PresenceChannel;
  subscribe(name: `private-${string}`): PrivateChannel;
  subscribe(name: string): Channel;
  subscribe(name: string): Channel {
    let channel = this.channels.get(name);
    if (!channel) {
      channel = channelFor(
        name,
        (f) => this.connection.send(f),
        this.authorizer,
      );
      this.channels.set(name, channel);
    }
    if (this.connection.state === "connected") this.sendSubscribe(channel);
    return channel;
  }

  /**
   * Identify this connection's member, so the events API can address it and the
   * disconnect API can terminate it. Resolves with the member the backend
   * signed for; the identity is re-established automatically on every
   * reconnect, so call it once.
   *
   *   const member = await bird.signin();
   *
   * The connection closes with code 4009 when the API terminates this member's
   * connections; bind `connection.bind("error")` to see it. A re-signin that
   * fails after a reconnect has no promise to reject, so it is reported on
   * `connection.bind("signin_error")` instead.
   *
   * A pending signin() rejects on any connection-level error, because the wire
   * does not attribute an error to the signin that caused it. If the signin in
   * fact succeeded, `signedInMember` holds the identity and calling signin()
   * again resolves from it immediately.
   */
  signin(): Promise<SignedInMember> {
    this.signinArmed = true;
    if (this.member) return Promise.resolve(this.member);
    const pending = new Promise<SignedInMember>((resolve, reject) => {
      this.signinWaiters.push({ resolve, reject });
    });
    if (this.connection.state === "connected") void this.sendSignin();
    return pending;
  }

  /** The signed-in member, or null when this connection has no identity. */
  get signedInMember(): SignedInMember | null {
    return this.member;
  }

  /** Unsubscribe and forget a channel. */
  unsubscribe(name: string): void {
    const channel = this.channels.get(name);
    if (!channel) return;
    this.connection.send({
      event: Outbound.Unsubscribe,
      data: { channel: name },
    });
    channel.reset();
    this.channels.delete(name);
  }

  /** The channel for `name`, if subscribed. */
  channel(name: `presence-${string}`): PresenceChannel | undefined;
  channel(name: `private-${string}`): PrivateChannel | undefined;
  channel(name: string): Channel | undefined;
  channel(name: string): Channel | undefined {
    return this.channels.get(name);
  }

  /** (Re)open the connection after a `disconnect()`. */
  connect(): void {
    this.connection.connect();
  }

  /** Close the connection; no reconnect. Channels are retained for a later `connect()`. */
  disconnect(): void {
    this.connection.disconnect();
  }

  private subscribeAll(): void {
    for (const channel of this.channels.values()) this.sendSubscribe(channel);
  }

  private sendSubscribe(channel: Channel): void {
    const connectionId = this.connection.connectionId;
    if (!connectionId) return;
    void channel.startSubscribe(
      connectionId,
      // Late continuations check this: same connection, channel not replaced.
      () =>
        this.connection.connectionId === connectionId &&
        this.channels.get(channel.name) === channel,
    );
  }

  private async sendSignin(): Promise<void> {
    const connectionId = this.connection.connectionId;
    if (!connectionId) return;
    let payload;
    try {
      payload = await this.memberAuthorizer({ connectionId });
    } catch (error) {
      // A rejection that lands after a reconnect belongs to a superseded
      // attempt: its waiters are the new attempt's now, and the connection it
      // failed on is gone, so neither may be touched.
      if (this.connection.connectionId !== connectionId) return;
      this.failSignin(
        error instanceof Error ? error : new BirdRealtimeError(String(error)),
        { notify: true },
      );
      return;
    }
    // The authorization was for the connection that asked for it; a reconnect
    // in the meantime gets its own signin from the `connected` handler.
    if (this.connection.connectionId !== connectionId) return;
    this.connection.send({
      event: Outbound.Signin,
      data: { auth: payload.auth, member_data: payload.member_data },
    });
  }

  private handleSigninSuccess(frame: Frame): void {
    const { member_data: memberData } = (frame.data ?? {}) as {
      member_data?: unknown;
    };
    // member_data is echoed as the JSON string the backend signed.
    let parsed: unknown = memberData;
    if (typeof memberData === "string") {
      try {
        parsed = JSON.parse(memberData);
      } catch {
        parsed = undefined;
      }
    }
    const memberId = (parsed as { member_id?: unknown })?.member_id;
    if (typeof memberId !== "string") {
      this.failSignin(
        new BirdRealtimeError("Signin succeeded without a member_id"),
      );
      return;
    }
    const member: SignedInMember = { member_id: memberId };
    const memberInfo = (parsed as { member_info?: unknown }).member_info;
    if (memberInfo !== undefined) member.member_info = memberInfo;
    this.member = member;
    const waiters = this.signinWaiters;
    this.signinWaiters = [];
    for (const waiter of waiters) waiter.resolve(member);
  }

  private failSignin(error: Error, options?: { notify: boolean }): void {
    const waiters = this.signinWaiters;
    this.signinWaiters = [];
    for (const waiter of waiters) waiter.reject(error);
    // The re-signin after a reconnect has no waiter to reject, so a failure
    // there would otherwise be silent: the socket looks healthy while the
    // connection has no identity and cannot be addressed or disconnected.
    if (options?.notify && waiters.length === 0 && this.signinArmed) {
      // Deliberately not `error`: the client's own `error` handler invalidates
      // every channel's in-flight authorization, and after a reconnect
      // subscribeAll() and sendSignin() run together, so reusing it would let a
      // failing member endpoint cancel unrelated subscribes.
      this.connection.emit("signin_error", { message: error.message });
    }
  }

  private route(frame: Frame): void {
    if (frame.event === Inbound.SigninSuccess) {
      this.handleSigninSuccess(frame);
      return;
    }
    if (!frame.channel) return;
    this.channels.get(frame.channel)?.handleEvent(frame);
  }
}
