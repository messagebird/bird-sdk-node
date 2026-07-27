// `bird.mailboxThread` + `bird.mailboxThreadMessage` — conversation threads
// and their individual messages inside agent mailboxes.

import {
  deleteEmailThread,
  getEmailThread,
  getEmailThreadMessage,
  getEmailThreadMessageBody,
  listEmailThreadMessageAttachments,
  listEmailThreadMessages,
  listEmailThreads,
  replyEmailThreadMessage,
  updateEmailThread,
} from "../generated/sdk.gen.js";
import type {
  EmailThread,
  EmailThreadList,
  EmailThreadMessage,
  EmailThreadMessageAttachmentList,
  EmailThreadMessageBody,
  EmailThreadMessageList,
  EmailThreadMessageReplyRequest,
  EmailThreadUpdateRequest,
  ListEmailThreadMessagesData,
  ListEmailThreadsData,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type { APIPromise, PaginatedPromise, RequestOptions } from "../core/result.js";

/** A mailbox conversation thread. */
export type { EmailThread, EmailThreadList };
/** Partial update for a thread — add/remove labels, link/unlink a contact. */
export type MailboxThreadUpdateParams = EmailThreadUpdateRequest;
/** Filters for `bird.mailboxThread.list`. */
export type MailboxThreadListQuery = NonNullable<ListEmailThreadsData["query"]>;

/** A single message in a conversation. */
export type { EmailThreadMessage, EmailThreadMessageList };
/** The parsed HTML and plain-text body of a message. */
export type { EmailThreadMessageBody };
/** Attachment manifest for a message. */
export type { EmailThreadMessageAttachmentList };
/** Parameters for `bird.mailboxThreadMessage.reply`. */
export type MailboxThreadMessageReplyParams = EmailThreadMessageReplyRequest;
/** Filters for `bird.mailboxThreadMessage.list`. */
export type MailboxThreadMessageListQuery = NonNullable<ListEmailThreadMessagesData["query"]>;

export class MailboxThreadResource extends Resource {
  /**
   * Get a conversation thread.
   *
   * @example Get a thread
   * const thread = await bird.mailboxThread.get("thr_01abc");
   * console.log(thread.message_count);
   */
  get(threadId: string, options?: RequestOptions): APIPromise<EmailThread> {
    return this.call<EmailThread>("GET", options, ({ signal, headers }) =>
      getEmailThread({ client: this.client, path: { thread_id: threadId }, headers, signal }),
    );
  }

  /**
   * Apply label changes or contact link changes to a thread.
   *
   * @example Archive a thread
   * const thread = await bird.mailboxThread.update("thr_01abc", {
   *   labels: { add: ["archive"] },
   * });
   */
  update(
    threadId: string,
    params: MailboxThreadUpdateParams,
    options?: RequestOptions,
  ): APIPromise<EmailThread> {
    return this.call<EmailThread>("PATCH", options, ({ signal, headers }) =>
      updateEmailThread({
        client: this.client,
        path: { thread_id: threadId },
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Move a thread to trash. Pass `query.permanent = true` to delete immediately.
   *
   * @example Delete a thread
   * await bird.mailboxThread.delete("thr_01abc");
   */
  delete(
    threadId: string,
    query?: { permanent?: boolean },
    options?: RequestOptions,
  ): APIPromise<void> {
    return this.call<void>("DELETE", options, ({ signal, headers }) =>
      deleteEmailThread({ client: this.client, path: { thread_id: threadId }, query, headers, signal }),
    );
  }

  /**
   * List threads across the workspace's mailboxes. `await` resolves the first
   * page; `for await` walks every thread.
   *
   * @example List threads in the inbox
   * for await (const thread of bird.mailboxThread.list()) {
   *   console.log(thread.id, thread.message_count);
   * }
   */
  list(query?: MailboxThreadListQuery, options?: RequestOptions): PaginatedPromise<EmailThread> {
    return this.paginated<EmailThread>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listEmailThreads({
          client: this.client,
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }
}

export class MailboxThreadMessageResource extends Resource {
  /**
   * Get metadata for a message (not the body; use `body` for that).
   *
   * @example Get a message
   * const msg = await bird.mailboxThreadMessage.get("thr_01abc", "rem_01xyz");
   * console.log(msg.direction); // "inbound"
   */
  get(threadId: string, messageId: string, options?: RequestOptions): APIPromise<EmailThreadMessage> {
    return this.call<EmailThreadMessage>("GET", options, ({ signal, headers }) =>
      getEmailThreadMessage({
        client: this.client,
        path: { thread_id: threadId, message_id: messageId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Get the parsed HTML and plain-text body of a message.
   *
   * @example Get message body
   * const body = await bird.mailboxThreadMessage.body("thr_01abc", "rem_01xyz");
   * console.log(body.text);
   */
  body(threadId: string, messageId: string, options?: RequestOptions): APIPromise<EmailThreadMessageBody> {
    return this.call<EmailThreadMessageBody>("GET", options, ({ signal, headers }) =>
      getEmailThreadMessageBody({
        client: this.client,
        path: { thread_id: threadId, message_id: messageId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Reply to a message from the mailbox's own address.
   *
   * @example Reply to a message
   * const reply = await bird.mailboxThreadMessage.reply("thr_01abc", "rem_01xyz", {
   *   text: "Thanks for reaching out!",
   * });
   */
  reply(
    threadId: string,
    messageId: string,
    params: MailboxThreadMessageReplyParams,
    options?: RequestOptions,
  ): APIPromise<EmailThreadMessage> {
    return this.call<EmailThreadMessage>("POST", options, ({ signal, headers }) =>
      replyEmailThreadMessage({
        client: this.client,
        path: { thread_id: threadId, message_id: messageId },
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * List the attachment manifest for a message.
   *
   * @example List attachments
   * const atts = await bird.mailboxThreadMessage.attachments("thr_01abc", "rem_01xyz");
   * console.log(atts.data.map(a => a.filename));
   */
  attachments(
    threadId: string,
    messageId: string,
    options?: RequestOptions,
  ): APIPromise<EmailThreadMessageAttachmentList> {
    return this.call<EmailThreadMessageAttachmentList>("GET", options, ({ signal, headers }) =>
      listEmailThreadMessageAttachments({
        client: this.client,
        path: { thread_id: threadId, message_id: messageId },
        headers,
        signal,
      }),
    );
  }

  /**
   * List messages in a thread. `await` resolves the first page; `for await`
   * walks every message.
   *
   * @example List messages
   * for await (const msg of bird.mailboxThreadMessage.list("thr_01abc")) {
   *   console.log(msg.id, msg.direction);
   * }
   */
  list(
    threadId: string,
    query?: MailboxThreadMessageListQuery,
    options?: RequestOptions,
  ): PaginatedPromise<EmailThreadMessage> {
    return this.paginated<EmailThreadMessage>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listEmailThreadMessages({
          client: this.client,
          path: { thread_id: threadId },
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }
}
