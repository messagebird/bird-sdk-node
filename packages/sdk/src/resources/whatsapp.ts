// `bird.whatsapp` — the WhatsApp channel (ADR-0042 §8: a channel, singular,
// that acts with `send`). Send a template message, read a message back, list
// the message log, and list a single message's lifecycle event timeline.
// Calls the generated hey-api SDK functions through the lifecycle core.

import {
  getWhatsAppMessage,
  listWhatsAppMessageEvents,
  listWhatsAppMessages,
  sendWhatsAppMessage,
} from "../generated/sdk.gen.js";
import type {
  ListWhatsAppMessageEventsData,
  ListWhatsAppMessagesData,
  WhatsAppMessageSendRequest,
  WhatsAppEventList,
  WhatsAppMessage,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type {
  APIPromise,
  PaginatedPromise,
  RequestOptions,
} from "../core/result.js";

/** A sent or received WhatsApp message with its status and template. */
export type { WhatsAppMessage };
/** Body for `bird.whatsapp.send` — a template send; Bird picks the sender from the template's category. */
export type WhatsappSendParams = WhatsAppMessageSendRequest;
/** Filters and cursor params for `bird.whatsapp.list`. */
export type WhatsappListQuery = NonNullable<ListWhatsAppMessagesData["query"]>;
/** Filter for `bird.whatsapp.listEvents`. */
export type WhatsappListEventsQuery = NonNullable<
  ListWhatsAppMessageEventsData["query"]
>;
/** The (unpaginated) event timeline for a WhatsApp message. */
export type { WhatsAppEventList };

export class WhatsappResource extends Resource {
  /**
   * Send a template message. Bird selects the sender number from the
   * template's category, so there is no sender field on the request. The
   * result is `accepted`, not yet delivered — read it back with `get` to
   * confirm.
   *
   * @example
   * const msg = await bird.whatsapp.send({
   *   to: "+15551234567",
   *   template: {
   *     name: "bird_otp",
   *     components: [
   *       { type: "body", parameters: [{ type: "text", text: "123456" }] },
   *     ],
   *   },
   * });
   * console.log(msg.id, msg.status);
   */
  send(
    params: WhatsappSendParams,
    options?: RequestOptions,
  ): APIPromise<WhatsAppMessage> {
    return this.call<WhatsAppMessage>("POST", options, ({ signal, headers }) =>
      sendWhatsAppMessage({
        client: this.client,
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Fetch a single WhatsApp message: its current delivery status and failure
   * detail if it failed.
   *
   * @example
   * const msg = await bird.whatsapp.get("wa_abc123");
   * msg.status; // "accepted" | "delivered" | …
   */
  get(
    messageId: string,
    options?: RequestOptions,
  ): APIPromise<WhatsAppMessage> {
    return this.call<WhatsAppMessage>("GET", options, ({ signal, headers }) =>
      getWhatsAppMessage({
        client: this.client,
        path: { message_id: messageId },
        headers,
        signal,
      }),
    );
  }

  /**
   * List WhatsApp messages, newest first. `await` resolves the first page;
   * `for await` walks every message across all pages. Filter by status,
   * recipient phone number, or business-scoped user ID.
   *
   * @example
   * for await (const msg of bird.whatsapp.list({ status: ["delivered"] })) {
   *   console.log(msg.id, msg.status);
   * }
   */
  list(
    query?: WhatsappListQuery,
    options?: RequestOptions,
  ): PaginatedPromise<WhatsAppMessage> {
    return this.paginated<WhatsAppMessage>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listWhatsAppMessages({
          client: this.client,
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }

  /**
   * List a WhatsApp message's lifecycle event timeline, in chronological
   * order. The timeline is bounded and returned in full — this list is not
   * paginated.
   *
   * @example
   * const { data } = await bird.whatsapp.listEvents("wa_abc123");
   * for (const event of data) console.log(event.type, event.occurred_at);
   */
  listEvents(
    messageId: string,
    query?: WhatsappListEventsQuery,
    options?: RequestOptions,
  ): APIPromise<WhatsAppEventList> {
    return this.call<WhatsAppEventList>("GET", options, ({ signal, headers }) =>
      listWhatsAppMessageEvents({
        client: this.client,
        path: { message_id: messageId },
        query,
        headers,
        signal,
      }),
    );
  }
}
