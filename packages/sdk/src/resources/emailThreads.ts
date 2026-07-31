// `bird.email.threads` — the generated thread facade plus its nested messages
// collection, which a generated class can't declare.

import { Resource } from "./base.js";
import { EmailThreadsResource as EmailThreadsResourceBase } from "./emailThreads.gen.js";
import { EmailThreadsMessagesResource } from "./emailThreadsMessages.gen.js";

export class EmailThreadsResource extends EmailThreadsResourceBase {
  /** Messages in a conversation — `bird.email.threads.messages.list(...)`, `.reply(...)`, … */
  readonly messages: EmailThreadsMessagesResource;

  constructor(...args: ConstructorParameters<typeof Resource>) {
    super(...args);
    this.messages = new EmailThreadsMessagesResource(...args);
  }
}
