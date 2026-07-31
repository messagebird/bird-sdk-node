// `bird.email.mailboxes.messages` — the override residue over the generated
// mailbox facade: create (address-list body).

import { createMailboxMessage } from "../generated/sdk.gen.js";
import type {
  EmailMailboxComposeRequest,
  EmailThreadMessage,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** Parameters for sending a new message from a mailbox. */
export type EmailMailboxesMessagesCreateParams = EmailMailboxComposeRequest;
/** A message returned from create or reply. */
export type { EmailThreadMessage };

export class EmailMailboxesMessagesResource extends Resource {
  /**
   * Send a new email from this mailbox, starting a new conversation.
   *
   * @example Send from a mailbox
   * const msg = await bird.email.mailboxes.messages.create("mbx_01abc", {
   *   to: ["customer@example.com"],
   *   subject: "Hello",
   *   text: "Hi there!",
   * });
   */
  create(
    mailboxId: string,
    params: EmailMailboxesMessagesCreateParams,
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
