// `bird.sms` — the SMS channel: send SMS messages and read their status.

import {
  createSmsMessage,
  createSmsMessageBatch,
} from "../generated/sdk.gen.js";
import type {
  SmsMessage,
  SmsMessageBatchRequest,
  SmsMessageBatchResponse,
  SmsMessageSendRequest,
} from "../generated/types.gen.js";
import { SmsResourceBase } from "./sms.gen.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** Body for `bird.sms.send` — supply either `text` (with `category`) or `template`. */
export type SmsSendParams = SmsMessageSendRequest;
/** Body for `bird.sms.sendBatch` — an array of up to 100 sends. */
export type SmsSendBatchParams = SmsMessageBatchRequest;
/** Result of `bird.sms.sendBatch`. */
export type SmsSendBatchResult = SmsMessageBatchResponse;
/** Filters and cursor params for `bird.sms.list`. */

export class SmsResource extends SmsResourceBase {
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
}
