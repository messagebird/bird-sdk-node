import { defaultAuthorizer } from "./auth.js";
import {
  channelFor,
  PresenceChannel,
  PrivateChannel,
  type Channel,
} from "./channel.js";
import { Connection } from "./connection.js";
import { BirdRealtimeError } from "./errors.js";
import { Outbound, type Frame } from "./protocol.js";
import type { Authorizer, Options } from "./types.js";

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

  constructor(options: Options) {
    this.appKey = options.appKey;
    this.authorizer =
      options.authorizer ??
      defaultAuthorizer(
        options.authEndpoint ?? "/bird/auth",
        options.authHeaders,
        options.allowCrossOriginAuth,
      );

    this.connection = new Connection(resolveUrl(options), {
      activityTimeout: options.activityTimeout,
      pongTimeout: options.pongTimeout,
      webSocket: options.webSocket,
    });
    this.connection.bind("connected", () => this.subscribeAll());
    this.connection.bind("message", (frame) => this.route(frame as Frame));
    // Server subscribe rejections arrive as connection-level bird:error frames
    // with no channel field, so they cannot be attributed to one channel —
    // bind `connection.on("error")` for them. They do invalidate in-flight
    // attempts so subscribe() can retry instead of being wedged.
    this.connection.bind("error", () => {
      for (const channel of this.channels.values()) channel.invalidateAttempt();
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

  private route(frame: Frame): void {
    if (!frame.channel) return;
    this.channels.get(frame.channel)?.handleEvent(frame);
  }
}
