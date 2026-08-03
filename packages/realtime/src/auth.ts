import { RealtimeAuthError } from "./errors.js";
import type {
  Authorizer,
  ChannelAuthResponse,
  MemberAuthorizer,
  MemberAuthResponse,
} from "./types.js";

/**
 * Default private/presence authorizer: POST the connection id + channel name to the
 * customer's auth endpoint as JSON and return the parsed auth payload. The
 * endpoint is the customer's backend, which holds the app secret and computes
 * the signature.
 */
export function defaultAuthorizer(
  endpoint: string,
  headers?: Record<string, string>,
  allowCrossOrigin?: boolean,
): Authorizer {
  return async ({ connectionId, channelName }) => {
    const crossOrigin = isCrossOrigin(endpoint);
    if (crossOrigin && !allowCrossOrigin) {
      throw new RealtimeAuthError(
        `authEndpoint ${endpoint} is cross-origin; set allowCrossOriginAuth to opt in`,
        endpoint,
        0,
      );
    }
    // Credentials never travel to another origin: authHeaders are same-origin only.
    const extraHeaders = crossOrigin ? undefined : headers;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...extraHeaders },
      body: JSON.stringify({
        connection_id: connectionId,
        channel_name: channelName,
      }),
    });
    if (!res.ok) {
      throw new RealtimeAuthError(
        `Channel authorization failed (${res.status}) for ${channelName}`,
        endpoint,
        res.status,
      );
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new RealtimeAuthError(
        `Channel authorization for ${channelName} returned a non-JSON body`,
        endpoint,
        res.status,
      );
    }
    // The response is untrusted network input: guard the shape instead of
    // casting, or an HTML 200 would send the subscribe out unsigned.
    const auth = (body as { auth?: unknown })?.auth;
    if (typeof auth !== "string" || auth.length === 0) {
      throw new RealtimeAuthError(
        `Channel authorization for ${channelName} returned no "auth" string`,
        endpoint,
        res.status,
      );
    }
    const memberData = (body as { member_data?: unknown }).member_data;
    const out: ChannelAuthResponse = { auth };
    if (typeof memberData === "string") out.member_data = memberData;
    return out;
  };
}

/**
 * Default signin authorizer: POST the connection id to the customer's member
 * auth endpoint and return the parsed payload. Unlike channel authorization,
 * `member_data` is required — it is the identity itself, not an extra.
 */
export function defaultMemberAuthorizer(
  endpoint: string,
  headers?: Record<string, string>,
  allowCrossOrigin?: boolean,
): MemberAuthorizer {
  return async ({ connectionId }) => {
    const crossOrigin = isCrossOrigin(endpoint);
    if (crossOrigin && !allowCrossOrigin) {
      throw new RealtimeAuthError(
        `memberAuthEndpoint ${endpoint} is cross-origin; set allowCrossOriginAuth to opt in`,
        endpoint,
        0,
      );
    }
    const extraHeaders = crossOrigin ? undefined : headers;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...extraHeaders },
      body: JSON.stringify({ connection_id: connectionId }),
    });
    if (!res.ok) {
      throw new RealtimeAuthError(
        `Signin authorization failed (${res.status})`,
        endpoint,
        res.status,
      );
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new RealtimeAuthError(
        "Signin authorization returned a non-JSON body",
        endpoint,
        res.status,
      );
    }
    const auth = (body as { auth?: unknown })?.auth;
    const memberData = (body as { member_data?: unknown })?.member_data;
    if (typeof auth !== "string" || auth.length === 0) {
      throw new RealtimeAuthError(
        'Signin authorization returned no "auth" string',
        endpoint,
        res.status,
      );
    }
    if (typeof memberData !== "string" || memberData.length === 0) {
      throw new RealtimeAuthError(
        'Signin authorization returned no "member_data" string',
        endpoint,
        res.status,
      );
    }
    const out: MemberAuthResponse = { auth, member_data: memberData };
    return out;
  };
}

/** True when `endpoint` resolves to an origin other than the page's own. */
function isCrossOrigin(endpoint: string): boolean {
  const pageOrigin = (
    globalThis as { location?: { origin?: string; href?: string } }
  ).location;
  if (!pageOrigin?.href) {
    // No page origin (tests, workers without location): a relative endpoint has
    // nowhere to resolve cross to; an absolute one is treated as cross-origin.
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(endpoint);
  }
  try {
    return new URL(endpoint, pageOrigin.href).origin !== pageOrigin.origin;
  } catch {
    return true;
  }
}
