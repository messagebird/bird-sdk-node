// `bird.sms` — the SMS channel (ADR-0042 §8: a channel, singular, that acts with
// `send`). Send free text or a stored template, read a message back, and list the
// message log. Calls the generated hey-api SDK functions through the lifecycle core.

import {
  createSmsMessage,
  createSmsMessageBatch,
  getSmsMessage,
  listSmsMessages,
} from "../generated/sdk.gen.js";
import type {
  ListSmsMessagesData,
  SmsMessage,
  SmsMessageBatchRequest,
  SmsMessageBatchResponse,
  SmsMessageSendRequest,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type {
  APIPromise,
  PaginatedPromise,
  RequestOptions,
} from "../core/result.js";

/** A sent or received SMS with its status, segment breakdown, and cost. */
export type { SmsMessage };
/** Body for `bird.sms.send` — supply either `text` (with `category`) or `template`. */
export type SmsSendParams = SmsMessageSendRequest;
/** Body for `bird.sms.sendBatch` — an array of up to 100 sends. */
export type SmsSendBatchParams = SmsMessageBatchRequest;
/** Result of `bird.sms.sendBatch`. */
export type SmsSendBatchResult = SmsMessageBatchResponse;
/** Filters and cursor params for `bird.sms.list`. */
export type SmsListQuery = NonNullable<ListSmsMessagesData["query"]>;

export class SmsResource extends Resource {
  /**
   * Send one SMS to a single recipient. Supply either `text` (with a `category`)
   * or a stored `template` (by `id` or `name`, with its `parameters`). The
   * result is `accepted`, not yet delivered — read it back with `get` to confirm.
   *
   * @example Send free text
   * const msg = await bird.sms.send({
   *   from: "MyBrand",
   *   to: "+14155550100",
   *   text: "Your verification code is 123456.",
   *   category: "authentication",
   * });
   * console.log(msg.id, msg.status);
   *
   * @example Send by template
   * await bird.sms.send({
   *   to: "+14155550100",
   *   template: { name: "bird_otp_verification", parameters: { code: "123456" } },
   * });
   */
  send(
    params: SmsSendParams,
    options?: RequestOptions,
  ): APIPromise<SmsMessage> {
    return this.call<SmsMessage>("POST", options, ({ signal, headers }) =>
      createSmsMessage({ client: this.client, body: params, headers, signal }),
    );
  }

  /**
   * Send up to 100 independent SMS messages in one call. Each item is a full send
   * (free text or template); all items are validated before any are queued.
   *
   * @example
   * const result = await bird.sms.sendBatch([
   *   { to: "+15551111111", text: "Hi Alice!", category: "marketing" },
   *   { to: "+15552222222", text: "Hi Bob!", category: "marketing" },
   * ]);
   */
  sendBatch(
    params: SmsSendBatchParams,
    options?: RequestOptions,
  ): APIPromise<SmsSendBatchResult> {
    return this.call<SmsSendBatchResult>(
      "POST",
      options,
      ({ signal, headers }) =>
        createSmsMessageBatch({
          client: this.client,
          body: params,
          headers,
          signal,
        }),
    );
  }

  /**
   * Fetch a single SMS message: its current delivery status, segment breakdown,
   * cost, and failure detail if it failed.
   *
   * @example
   * const msg = await bird.sms.get("sms_abc123");
   * msg.status; // "accepted" | "delivered" | …
   */
  get(messageId: string, options?: RequestOptions): APIPromise<SmsMessage> {
    return this.call<SmsMessage>("GET", options, ({ signal, headers }) =>
      getSmsMessage({
        client: this.client,
        path: { message_id: messageId },
        headers,
        signal,
      }),
    );
  }

  /**
   * List SMS messages, newest first. `await` resolves the first page; `for await`
   * walks every message across all pages. Filter by direction, status, category,
   * recipient, sender, or tag.
   *
   * @example
   * for await (const msg of bird.sms.list({ direction: "outbound" })) {
   *   console.log(msg.id, msg.status);
   * }
   */
  list(
    query?: SmsListQuery,
    options?: RequestOptions,
  ): PaginatedPromise<SmsMessage> {
    return this.paginated<SmsMessage>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listSmsMessages({
          client: this.client,
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }
}
