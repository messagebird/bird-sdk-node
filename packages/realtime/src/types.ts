// Public configuration and types.

/** Minimal structural type for a WebSocket, so tests can inject a fake. */
export interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev?: unknown) => void) | null;
  onclose: ((ev: { code: number; reason?: string }) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
}
export type WebSocketFactory = (url: string) => WebSocketLike;

/** Connection lifecycle states. */
export type ConnectionState =
  | "initialized"
  | "connecting"
  | "connected"
  | "unavailable"
  | "disconnected"
  | "failed";

/**
 * Authorizer for private/presence channels. Given the connection id and
 * the channel name, return the auth payload the server validates. The default
 * implementation POSTs to `authEndpoint`; provide this to fully customize.
 */
export type Authorizer = (params: {
  connectionId: string;
  channelName: string;
}) => Promise<ChannelAuthResponse>;

/** The auth payload returned by the customer's auth endpoint. */
export interface ChannelAuthResponse {
  /** `<key>:<hmac>` signature the server verifies. */
  auth: string;
  /** Presence channels only: JSON string with `member_id` and `member_info`. */
  member_data?: string;
}

export interface Options {
  /** The Realtime app key clients connect with. */
  appKey: string;
  /**
   * The Bird region the app runs in (e.g. `"us1"`, `"eu1"`). Resolves the edge
   * host `wss://ws-<region>.realtime.platform.bird.com`. Required unless
   * `wsHost` is given.
   */
  region?: string;
  /** Explicit WebSocket host, overriding region resolution (self-host/testing). */
  wsHost?: string;
  /**
   * Allow `ws://` (plaintext) instead of `wss://`. Honored only for loopback
   * hosts (`localhost`, `127.0.0.1`, `[::1]`) — a non-loopback host stays TLS
   * regardless, so a copied config can't silently downgrade real traffic.
   */
  allowInsecure?: boolean;
  /**
   * Endpoint the default authorizer POSTs to for private/presence channels.
   * Receives `connection_id` and `channel_name`; returns the auth JSON. Defaults to
   * `/bird/auth` (same-origin).
   */
  authEndpoint?: string;
  /**
   * Extra headers sent with the default authorizer's request. Attached only to
   * a same-origin `authEndpoint` — credentials must not travel to another
   * origin (see `allowCrossOriginAuth`).
   */
  authHeaders?: Record<string, string>;
  /**
   * Opt in to a cross-origin `authEndpoint`. Without it a cross-origin
   * endpoint fails at subscribe time; with it the request is made but
   * `authHeaders` are still withheld.
   */
  allowCrossOriginAuth?: boolean;
  /** Fully replace the private/presence authorization strategy. */
  authorizer?: Authorizer;
  /** Milliseconds of inactivity before sending a ping. Server may override. */
  activityTimeout?: number;
  /** Milliseconds to wait for a pong before treating the connection as dead. */
  pongTimeout?: number;
  /**
   * WebSocket constructor, defaulting to the global. A deliberate seam (the
   * sibling SDK declares `fetch` the same way): tests and exotic runtimes
   * inject their own transport.
   */
  webSocket?: WebSocketFactory;
}

/** A member of a presence channel. Field names match the wire verbatim. */
export interface Member {
  member_id: string;
  member_info: unknown;
}
