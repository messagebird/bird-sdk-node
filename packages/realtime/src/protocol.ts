// The Bird Realtime wire protocol. A frame is JSON: { event, channel?, data? }.
// `data` is often itself a JSON-encoded string (double-encoded), so decode()
// parses it back to a value.
//
// System and lifecycle events live under two reserved namespaces the server
// speaks for Bird apps — `bird:` (protocol/system) and `bird_internal:`
// (subscription internals). Application event names are free-form and must not
// use these prefixes. Kept as single constants so the namespace is defined in
// exactly one place.

export const SYSTEM = "bird:";
export const INTERNAL = "bird_internal:";

/** Events the client sends to the server. */
export const Outbound = {
  Subscribe: `${SYSTEM}subscribe`,
  Unsubscribe: `${SYSTEM}unsubscribe`,
  Ping: `${SYSTEM}ping`,
  Pong: `${SYSTEM}pong`,
  Signin: `${SYSTEM}signin`,
} as const;

/** Events the server sends to the client. */
export const Inbound = {
  ConnectionEstablished: `${SYSTEM}connection_established`,
  Error: `${SYSTEM}error`,
  Ping: `${SYSTEM}ping`,
  Pong: `${SYSTEM}pong`,
  SigninSuccess: `${SYSTEM}signin_success`,
  SubscriptionSucceeded: `${INTERNAL}subscription_succeeded`,
  SubscriptionError: `${INTERNAL}subscription_error`,
  ConnectionCount: `${INTERNAL}connection_count`,
  MemberAdded: `${INTERNAL}member_added`,
  MemberRemoved: `${INTERNAL}member_removed`,
} as const;

/** User-facing lifecycle events, re-emitted from their `bird_internal:` origin. */
export const UserFacing = {
  SubscriptionSucceeded: `${SYSTEM}subscription_succeeded`,
  SubscriptionError: `${SYSTEM}subscription_error`,
  ConnectionCount: `${SYSTEM}connection_count`,
  MemberAdded: `${SYSTEM}member_added`,
  MemberRemoved: `${SYSTEM}member_removed`,
} as const;

/** Prefix reserved for client-originated events (`channel.trigger`). */
export const CLIENT_EVENT_PREFIX = "client-";

export interface Frame {
  event: string;
  channel?: string;
  data?: unknown;
}

/** True for events the SDK handles internally and never surfaces to bindings. */
export function isInternal(event: string): boolean {
  return event.startsWith(INTERNAL);
}

/**
 * Encode a frame for the socket. Outbound `data` is sent as a JSON value —
 * the double-encoding (`data` as a JSON-encoded string) exists only on the
 * server→client direction; a subscribe with stringified data is rejected by
 * the edge ("Expected parameter data to be a hash").
 */
export function encode(frame: Frame): string {
  const out: Record<string, unknown> = { event: frame.event };
  if (frame.channel !== undefined) out.channel = frame.channel;
  if (frame.data !== undefined) out.data = frame.data;
  return JSON.stringify(out);
}

/**
 * Decode a socket message into a frame. `data` may arrive as a JSON-encoded
 * string (the common case) or already-parsed; both are normalized to a value.
 * Returns null for a message that isn't a valid frame.
 */
export function decode(raw: string): Frame | null {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof msg !== "object" ||
    msg === null ||
    typeof (msg as Frame).event !== "string"
  ) {
    return null;
  }
  const m = msg as Record<string, unknown>;
  let data = m.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      // Leave non-JSON string payloads as-is.
    }
  }
  return {
    event: m.event as string,
    channel: typeof m.channel === "string" ? m.channel : undefined,
    data,
  };
}
