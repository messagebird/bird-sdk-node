// `bird.mailbox` — the override residue over the generated mailbox facade:
// compose (address-list body).

import { createMailboxMessage } from "../generated/sdk.gen.js";
import type {
  EmailMailboxComposeRequest,
  EmailThreadMessage,
} from "../generated/types.gen.js";
import { MailboxResourceBase } from "./mailbox.gen.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** A durable agent mailbox, the create body, and the list/stats filters. */
export type {
  Mailbox,
  MailboxCreateParams,
  MailboxListQuery,
  MailboxStatsQuery,
  MailboxStatsResponse,
  MailboxUpdateParams,
  MailboxUpdateQuery,
  EmailMailboxLabelList,
} from "./mailbox.gen.js";
/** Parameters for composing a new message from a mailbox. */
export type MailboxComposeParams = EmailMailboxComposeRequest;
/** A message returned from compose or reply. */
export type { EmailThreadMessage };

export class MailboxResource extends MailboxResourceBase {
  /**
   * Send a new email from this mailbox, starting a new conversation.
   *
   * @example Send from a mailbox
   * const msg = await bird.mailbox.compose("mbx_01abc", {
   *   to: ["customer@example.com"],
   *   subject: "Hello",
   *   text: "Hi there!",
   * });
   */
  compose(
    mailboxId: string,
    params: MailboxComposeParams,
    options?: RequestOptions,
  ): APIPromise<EmailThreadMessage> {
    return this.call<EmailThreadMessage>("POST", options, ({ signal, headers }) =>
      createMailboxMessage({
        client: this.client,
        path: { mailbox_id: mailboxId },
        body: params,
        headers,
        signal,
      }),
    );
  }
}
