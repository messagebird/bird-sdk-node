// `bird.webhooks` — verifies a delivered payload's Standard Webhooks signature
// and returns it as a typed, discriminated event union. Pure crypto: it never
// touches the transport layer, so it carries no client/core dependency.

import { Webhook } from "standardwebhooks";
import type { WebhookEvent } from "../generated/types.gen.js";
import { BirdWebhookVerificationError } from "../errors.js";

/** A verified webhook event — discriminated on `type` (ADR-0028 wire contract). */
export type BirdWebhookEvent = WebhookEvent;

/** Inbound request headers, as a `Headers` object or a plain record. */
export type WebhookHeaders = Headers | Record<string, string>;

/** Client-level webhooks config (`new BirdClient({ webhooks: { secret } })`). */
export interface WebhookOptions {
  /** Signing secret used by `unwrap`; a per-call `secret` overrides it. */
  secret?: string;
}

export class WebhooksResource {
  readonly #secret?: string;

  constructor(config?: WebhookOptions) {
    this.#secret = config?.secret;
  }

  /**
   * Verify a webhook delivery and return the typed event.
   *
   * **Pass the raw request body**, exactly as received — do NOT parse it first.
   * The Standard Webhooks signature is computed over the raw bytes, so parsing
   * and re-serializing before verifying is the classic webhook bug.
   *
   * The secret comes from `webhooks.secret` on the client; pass `{ secret }` to
   * override per call. Throws {@link BirdWebhookVerificationError} on a bad
   * signature, a stale timestamp, or missing/malformed headers. Unknown event
   * types are returned as-is (handle them in a `default` case) so a newer server
   * event can't break an older SDK.
   *
   * @example Verify and dispatch — pass the raw request body, never the parsed JSON
   * // new BirdClient({ apiKey, webhooks: { secret } })
   * try {
   *   const event = bird.webhooks.unwrap(rawBody, req.headers);
   *   switch (event.type) {
   *     case "email.delivered":
   *       markDelivered(event.email_id, event.recipient); // narrowed; fields are flat
   *       break;
   *     case "email.bounced":
   *     case "email.complained":
   *       suppress(event.recipient);
   *       break;
   *     default: // unknown future event types — an older SDK won't break on a new one
   *   }
   * } catch (err) {
   *   if (err instanceof BirdWebhookVerificationError) {
   *     // reject with 400 — bad signature, stale timestamp, or missing/malformed headers
   *   } else throw err;
   * }
   */
  unwrap(payload: string, headers: WebhookHeaders, options?: WebhookOptions): BirdWebhookEvent {
    const secret = options?.secret ?? this.#secret;
    if (!secret) {
      throw new Error(
        "No webhook secret. Set `webhooks: { secret }` on the client, or pass `{ secret }` to unwrap.",
      );
    }
    const wh = new Webhook(secret);
    let verified: unknown;
    try {
      verified = wh.verify(payload, toHeaderRecord(headers));
    } catch (err) {
      throw new BirdWebhookVerificationError(
        err instanceof Error ? err.message : "Webhook signature verification failed",
      );
    }
    // `verify` returns `unknown`; the payload is authenticated and the wire
    // schema is `additionalProperties: false`, so the assertion is sound here.
    return verified as BirdWebhookEvent;
  }
}

function toHeaderRecord(headers: WebhookHeaders): Record<string, string> {
  return headers instanceof Headers ? Object.fromEntries(headers) : headers;
}
