// `bird.email.mailboxes` — the generated mailbox facade plus its nested
// collections (messages, receiveRules), which a generated class can't declare.

import { Resource } from "./base.js";
import { EmailMailboxesResource as EmailMailboxesResourceBase } from "./emailMailboxes.gen.js";
import { EmailMailboxesMessagesResource } from "./emailMailboxesMessages.js";
import { EmailMailboxesReceiveRulesResource } from "./emailMailboxesReceiveRules.gen.js";

export class EmailMailboxesResource extends EmailMailboxesResourceBase {
  /** Messages sent from the mailbox's own address — `bird.email.mailboxes.messages.create(...)`. */
  readonly messages: EmailMailboxesMessagesResource;

  /** Per-sender allow/block rules — `bird.email.mailboxes.receiveRules.create(...)`, `.list(...)`, `.delete(...)`. */
  readonly receiveRules: EmailMailboxesReceiveRulesResource;

  constructor(...args: ConstructorParameters<typeof Resource>) {
    super(...args);
    this.messages = new EmailMailboxesMessagesResource(...args);
    this.receiveRules = new EmailMailboxesReceiveRulesResource(...args);
  }
}
