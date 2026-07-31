// `bird.email` — the email channel: send email messages and read their delivery status.

import {
  cancelEmailMessage,
  createEmailMessage,
  createEmailMessageBatch,
  getEmailMessage,
  listEmailMessages,
} from "../generated/sdk.gen.js";
import type {
  EmailMessage,
  EmailMessageBatchRequest,
  EmailMessageBatchResponse,
  EmailMessageSendRequest,
  ListEmailMessagesData,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import { EmailResourceBase } from "./email.gen.js";
import { EmailStatsResource } from "./emailStats.gen.js";
import { EmailMailboxesResource } from "./emailMailboxes.js";
import { EmailThreadsResource } from "./emailThreads.js";
import type {
  APIPromise,
  PaginatedPromise,
  RequestOptions,
} from "../core/result.js";

/** An email message with aggregate delivery status. */
export type { EmailMessage };
/** Body for `bird.email.send`. */
export type EmailSendParams = EmailMessageSendRequest;
/** Body for `bird.email.sendBatch` — an array of send params, validated as a unit. */
export type EmailSendBatchParams = EmailMessageBatchRequest;
/** Result of `bird.email.sendBatch` — one accepted item per submitted message. */
export type EmailSendBatchResult = EmailMessageBatchResponse;
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
    | "from"
    | "reply_to"
    | "category"
    | "track_opens"
    | "track_clicks"
    | "headers"
    | "tags"
    | "metadata"
  >
>;

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/** Keys that carry a configured default — made optional in `send`. */
type DefaultedKeys<D> = D extends object
  ? Extract<keyof D, keyof EmailSendParams>
  : never;
/** `send` params with defaulted fields made optional. */
export type EmailSend<D> = PartialBy<EmailSendParams, DefaultedKeys<D>>;

export class EmailResource<
  D extends EmailChannelDefaults | undefined = undefined,
> extends EmailResourceBase {
  #defaults?: D;

  /** Email statistics — `bird.email.stats.summary(...)`, `.daily(...)`, `.byTag(...)`, … */
  readonly stats: EmailStatsResource;

  /** Durable agent mailboxes — `bird.email.mailboxes.list(...)`, `.create(...)`, … */
  readonly mailboxes: EmailMailboxesResource;

  /** Conversations across every mailbox — `bird.email.threads.list(...)`, `.get(...)`, … */
  readonly threads: EmailThreadsResource;

  constructor(
    core: ConstructorParameters<typeof Resource>[0],
    client: ConstructorParameters<typeof Resource>[1],
    defaults?: D,
  ) {
    super(core, client);
    this.#defaults = defaults;
    this.stats = new EmailStatsResource(core, client);
    this.mailboxes = new EmailMailboxesResource(core, client);
    this.threads = new EmailThreadsResource(core, client);
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
  send(
    params: EmailSend<D>,
    options?: RequestOptions,
  ): APIPromise<EmailMessage> {
    // EmailSend<D> guarantees the caller supplied every field not covered by a
    // default, so the merge is a complete EmailSendParams. TS can't reprove that
    // across a spread, so the assertion is necessary here (and only here).
    const body = { ...this.#defaults, ...params } as EmailSendParams;
    return this.call<EmailMessage>("POST", options, ({ signal, headers }) =>
      createEmailMessage({ client: this.client, body, headers, signal }),
    );
  }

  /**
   * Send a batch of up to 100 independent email messages in one request. The
   * batch is validated as a unit — if any item fails validation (unverified
   * sender, all recipients suppressed, field-level errors) the whole batch is
   * rejected with a `BirdValidationError` and nothing is queued. Resolves with
   * one accepted item per submitted message, in submission order, once the batch
   * is accepted (the API's 202). Channel defaults are applied per item.
   *
   * @example Send a batch of messages
   * const batch = await bird.email.sendBatch([
   *   {
   *     from: { email: "onboarding@messagebird.dev", name: "Bird" },
   *     to: ["alice@example.com"],
   *     subject: "Your receipt",
   *     html: "<p>Thanks, Alice.</p>",
   *   },
   *   {
   *     from: { email: "onboarding@messagebird.dev", name: "Bird" },
   *     to: ["bob@example.com"],
   *     subject: "Your receipt",
   *     html: "<p>Thanks, Bob.</p>",
   *   },
   * ]);
   * for (const item of batch.data) console.log(item.id, item.status);
   */
  sendBatch(
    params: EmailSendBatchParams,
    options?: RequestOptions,
  ): APIPromise<EmailSendBatchResult> {
    const body = params.map((item) => ({
      ...this.#defaults,
      ...item,
    })) as EmailSendBatchParams;
    return this.call<EmailSendBatchResult>(
      "POST",
      options,
      ({ signal, headers }) =>
        createEmailMessageBatch({ client: this.client, body, headers, signal }),
    );
  }

}
