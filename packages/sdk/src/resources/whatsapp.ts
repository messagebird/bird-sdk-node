// `bird.whatsapp` — the WhatsApp channel: send WhatsApp messages and read their
// status and events.

import { sendWhatsAppMessage } from "../generated/sdk.gen.js";
import type {
  WhatsAppMessageSendRequest,
  WhatsAppMessage,
} from "../generated/types.gen.js";
import { WhatsappResourceBase } from "./whatsapp.gen.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** Body for `bird.whatsapp.send` — a template send; Bird picks the sender from the template's category. */
export type WhatsappSendParams = WhatsAppMessageSendRequest;

export class WhatsappResource extends WhatsappResourceBase {
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
}
