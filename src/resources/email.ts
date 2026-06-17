// `bird.email` — the email channel (ADR-0042 §8: channel, singular, `send`).
// The first concrete resource; the template every other channel/collection copies.
// Calls the generated hey-api SDK functions through the lifecycle core.

import { createEmailMessage, getEmailMessage, listEmailMessages } from "../generated/sdk.gen.js";
import type { EmailMessage, EmailMessageSendRequest, ListEmailMessagesData } from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type { APIPromise, PaginatedPromise, RequestOptions } from "../core/result.js";

/** An email message with aggregate delivery status. */
export type { EmailMessage };
/** Body for `bird.email.send`. */
export type EmailSendParams = EmailMessageSendRequest;
/** Filters and cursor params for `bird.email.list`. */
export type EmailListQuery = NonNullable<ListEmailMessagesData["query"]>;

/**
 * Channel-level defaults set at client construction. Field names mirror the
 * send params (so they read as pre-filled fields). Any field set here becomes
 * optional in `send` and is filled when omitted (per-send value wins).
 */
export type EmailChannelDefaults = Partial<
  Pick<
    EmailSendParams,
    "from" | "reply_to" | "category" | "track_opens" | "track_clicks" | "headers" | "tags" | "metadata"
  >
>;

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/** Keys that carry a configured default — made optional in `send`. */
type DefaultedKeys<D> = D extends object ? Extract<keyof D, keyof EmailSendParams> : never;
/** `send` params with defaulted fields made optional. */
export type EmailSend<D> = PartialBy<EmailSendParams, DefaultedKeys<D>>;

export class EmailResource<D extends EmailChannelDefaults | undefined = undefined> extends Resource {
  #defaults?: D;

  constructor(
    core: ConstructorParameters<typeof Resource>[0],
    client: ConstructorParameters<typeof Resource>[1],
    defaults?: D,
  ) {
    super(core, client);
    this.#defaults = defaults;
  }

  /**
   * Send an email message. Resolves once the message is accepted for delivery
   * (the API's 202). Throws on failure — a 422 (unverified sender, all
   * recipients suppressed, validation) is a `BirdValidationError`. Fields set as
   * channel defaults may be omitted (per-send value wins).
   *
   * @example Send a message
   * const msg = await bird.email.send({
   *   from: { email: "onboarding@messagebird.dev", name: "Bird" },
   *   to: ["delivered@messagebird.dev"],
   *   subject: "Hello from Bird",
   *   html: "<p>My first Bird email.</p>",
   * });
   * console.log(msg.id, msg.status); // "em_…", "accepted"
   *
   * @example A richer send — cc/bcc, reply-to, tags, metadata, click-tracking off, and an idempotency key (safe to retry; the server dedupes)
   * await bird.email.send(
   *   {
   *     from: "hello@acme.com",
   *     to: ["a@example.com", "b@example.com"],
   *     cc: ["manager@example.com"],
   *     reply_to: ["support@acme.com"],
   *     subject: "Your March invoice",
   *     html: "<p>Attached.</p>",
   *     tags: [{ name: "category", value: "billing" }],
   *     metadata: { invoice_id: "inv_123" },
   *     track_clicks: false,
   *   },
   *   { idempotencyKey: "invoice-march/cust_1" },
   * );
   *
   * @example Branch on the typed error hierarchy
   * import { BirdRateLimitError, BirdValidationError, BirdAPIError } from "@messagebird/sdk";
   *
   * try {
   *   await bird.email.send({
   *     from: { email: "onboarding@messagebird.dev", name: "Bird" },
   *     to: ["delivered@messagebird.dev"],
   *     subject: "Hello from Bird",
   *     html: "<p>My first Bird email.</p>",
   *   });
   * } catch (err) {
   *   if (err instanceof BirdRateLimitError) console.log(`rate limited — retry in ${err.retryAfter}s`);
   *   else if (err instanceof BirdValidationError) console.error(err.details);
   *   else if (err instanceof BirdAPIError) console.error(err.code, err.requestId);
   *   else throw err;
   * }
   *
   * @example Errors as values with `.safe()`
   * const { data, error } = await bird.email
   *   .send({
   *     from: { email: "onboarding@messagebird.dev", name: "Bird" },
   *     to: ["delivered@messagebird.dev"],
   *     subject: "Hello from Bird",
   *     html: "<p>My first Bird email.</p>",
   *   })
   *   .safe();
   * if (error) console.error(error.message);
   * else console.log(data.id);
   */
  send(params: EmailSend<D>, options?: RequestOptions): APIPromise<EmailMessage> {
    // EmailSend<D> guarantees the caller supplied every field not covered by a
    // default, so the merge is a complete EmailSendParams. TS can't reprove that
    // across a spread, so the assertion is necessary here (and only here).
    const body = { ...this.#defaults, ...params } as EmailSendParams;
    return this.call<EmailMessage>("POST", options, ({ signal, headers }) =>
      createEmailMessage({ client: this.client, body, headers, signal }),
    );
  }

  /**
   * Fetch a message with aggregate delivery status.
   *
   * @example
   * const msg = await bird.email.get("em_abc123");
   * msg.status; // "accepted" | "processed" | "delivered" | "bounced" | …
   * msg.delivered_count;
   * msg.bounced_count;
   */
  get(messageId: string, options?: RequestOptions): APIPromise<EmailMessage> {
    return this.call<EmailMessage>("GET", options, ({ signal, headers }) =>
      getEmailMessage({ client: this.client, path: { message_id: messageId }, headers, signal }),
    );
  }

  /**
   * List messages, newest first. `await` resolves the first page; `for await`
   * walks every message across all pages.
   *
   * @example Iterate every message, or take one page
   * for await (const message of bird.email.list({ status: "bounced" })) {
   *   console.log(message.id);
   * }
   * const page = await bird.email.list({ limit: 50 }); // page.data, page.next_cursor
   */
  list(query?: EmailListQuery, options?: RequestOptions): PaginatedPromise<EmailMessage> {
    return this.paginated<EmailMessage>("GET", options, ({ signal, headers }, cursor) =>
      listEmailMessages({
        client: this.client,
        query: { ...query, starting_after: cursor ?? query?.starting_after },
        headers,
        signal,
      }),
    );
  }
}
