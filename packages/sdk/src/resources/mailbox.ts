// `bird.mailbox` — agent mailboxes and their receive rules.

import {
  createMailbox,
  createMailboxMessage,
  createMailboxReceiveRule,
  deleteMailbox,
  deleteMailboxReceiveRule,
  getMailbox,
  getMailboxStats,
  listMailboxLabels,
  listMailboxes,
  listMailboxReceiveRules,
  restoreMailbox,
  resumeMailbox,
  updateMailbox,
} from "../generated/sdk.gen.js";
import type {
  CreateMailboxData,
  GetMailboxStatsData,
  EmailMailboxComposeRequest,
  EmailMailboxLabelList,
  EmailThreadMessage,
  ListMailboxReceiveRulesData,
  ListMailboxesData,
  Mailbox,
  MailboxCreate,
  MailboxList,
  MailboxStatsResponse,
  MailboxUpdate,
  ReceiveRule,
  ReceiveRuleCreate,
  ReceiveRuleList,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type { APIPromise, PaginatedPromise, RequestOptions } from "../core/result.js";

/** A durable agent mailbox on inbox.ai or a custom domain. */
export type { Mailbox, MailboxList };
/** Parameters for creating a mailbox. */
export type MailboxCreateParams = MailboxCreate;
/** Partial update for a mailbox; omitted fields are unchanged. */
export type MailboxUpdateParams = MailboxUpdate;
/** Filters for `bird.mailbox.list`. */
export type MailboxListQuery = NonNullable<ListMailboxesData["query"]>;
/** Statistics response for a mailbox. */
export type { MailboxStatsResponse };
/** Stats query parameters. */
export type MailboxStatsQuery = NonNullable<GetMailboxStatsData["query"]>;
/** Labels available in a mailbox. */
export type { EmailMailboxLabelList };
/** Parameters for composing a new message from a mailbox. */
export type MailboxComposeParams = EmailMailboxComposeRequest;
/** A message returned from compose or reply. */
export type { EmailThreadMessage };

/** A per-sender allow or block rule on a mailbox. */
export type { ReceiveRule, ReceiveRuleList };
/** Parameters for creating a receive rule. */
export type MailboxReceiveRuleCreateParams = ReceiveRuleCreate;
/** Filters for `bird.mailboxReceiveRule.list`. */
export type MailboxReceiveRuleListQuery = NonNullable<ListMailboxReceiveRulesData["query"]>;

export class MailboxResource extends Resource {
  /**
   * Create a mailbox. Omit `local_part` to auto-generate a handle on inbox.ai.
   *
   * @example Create a mailbox
   * const mailbox = await bird.mailbox.create({ display_name: "Support" });
   * console.log(mailbox.address); // "abc123@inbox.ai"
   */
  create(params?: MailboxCreateParams, options?: RequestOptions): APIPromise<Mailbox> {
    return this.call<Mailbox>("POST", options, ({ signal, headers }) =>
      createMailbox({ client: this.client, body: params ?? {}, headers, signal }),
    );
  }

  /**
   * Get a mailbox by id.
   *
   * @example Get a mailbox
   * const mailbox = await bird.mailbox.get("mbx_01abc");
   * console.log(mailbox.state); // "active"
   */
  get(mailboxId: string, options?: RequestOptions): APIPromise<Mailbox> {
    return this.call<Mailbox>("GET", options, ({ signal, headers }) =>
      getMailbox({ client: this.client, path: { mailbox_id: mailboxId }, headers, signal }),
    );
  }

  /**
   * Update a mailbox. Only the fields you provide change.
   *
   * @example Update receive policy
   * const mailbox = await bird.mailbox.update("mbx_01abc", { receive_policy: "open" });
   */
  update(mailboxId: string, params: MailboxUpdateParams, options?: RequestOptions): APIPromise<Mailbox> {
    return this.call<Mailbox>("PATCH", options, ({ signal, headers }) =>
      updateMailbox({ client: this.client, path: { mailbox_id: mailboxId }, body: params, headers, signal }),
    );
  }

  /**
   * Soft-delete a mailbox. It can be restored within 30 days.
   *
   * @example Delete a mailbox
   * await bird.mailbox.delete("mbx_01abc");
   */
  delete(mailboxId: string, options?: RequestOptions): APIPromise<void> {
    return this.call<void>("DELETE", options, ({ signal, headers }) =>
      deleteMailbox({ client: this.client, path: { mailbox_id: mailboxId }, headers, signal }),
    );
  }

  /**
   * Restore a deleted mailbox within its 30-day window.
   *
   * @example Restore a mailbox
   * const mailbox = await bird.mailbox.restore("mbx_01abc");
   */
  restore(mailboxId: string, options?: RequestOptions): APIPromise<Mailbox> {
    return this.call<Mailbox>("POST", options, ({ signal, headers }) =>
      restoreMailbox({ client: this.client, path: { mailbox_id: mailboxId }, headers, signal }),
    );
  }

  /**
   * Reactivate a suspended mailbox.
   *
   * @example Resume a mailbox
   * const mailbox = await bird.mailbox.resume("mbx_01abc");
   */
  resume(mailboxId: string, options?: RequestOptions): APIPromise<Mailbox> {
    return this.call<Mailbox>("POST", options, ({ signal, headers }) =>
      resumeMailbox({ client: this.client, path: { mailbox_id: mailboxId }, headers, signal }),
    );
  }

  /**
   * Get email activity statistics for a mailbox.
   *
   * @example Get mailbox stats
   * const stats = await bird.mailbox.stats("mbx_01abc");
   * console.log(stats.summary?.sends_accepted);
   */
  stats(mailboxId: string, query?: MailboxStatsQuery, options?: RequestOptions): APIPromise<MailboxStatsResponse> {
    return this.call<MailboxStatsResponse>("GET", options, ({ signal, headers }) =>
      getMailboxStats({ client: this.client, path: { mailbox_id: mailboxId }, query: query ?? {}, headers, signal }),
    );
  }

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
  compose(mailboxId: string, params: MailboxComposeParams, options?: RequestOptions): APIPromise<EmailThreadMessage> {
    return this.call<EmailThreadMessage>("POST", options, ({ signal, headers }) =>
      createMailboxMessage({ client: this.client, path: { mailbox_id: mailboxId }, body: params, headers, signal }),
    );
  }

  /**
   * List labels available in a mailbox.
   *
   * @example List labels
   * const labels = await bird.mailbox.labels("mbx_01abc");
   * console.log(labels.data.map(l => l.name));
   */
  labels(mailboxId: string, options?: RequestOptions): APIPromise<EmailMailboxLabelList> {
    return this.call<EmailMailboxLabelList>("GET", options, ({ signal, headers }) =>
      listMailboxLabels({ client: this.client, path: { mailbox_id: mailboxId }, headers, signal }),
    );
  }

  /**
   * List mailboxes in the workspace. `await` resolves the first page;
   * `for await` walks every mailbox.
   *
   * @example List mailboxes
   * for await (const mailbox of bird.mailbox.list()) {
   *   console.log(mailbox.address);
   * }
   */
  list(query?: MailboxListQuery, options?: RequestOptions): PaginatedPromise<Mailbox> {
    return this.paginated<Mailbox>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listMailboxes({
          client: this.client,
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }
}

export class MailboxReceiveRuleResource extends Resource {
  /**
   * Add an allow or block rule to a mailbox. Block rules always win.
   *
   * @example Block a domain
   * const rule = await bird.mailboxReceiveRule.create("mbx_01abc", {
   *   action: "block",
   *   entry: "spam.example.com",
   * });
   */
  create(
    mailboxId: string,
    params: MailboxReceiveRuleCreateParams,
    options?: RequestOptions,
  ): APIPromise<ReceiveRule> {
    return this.call<ReceiveRule>("POST", options, ({ signal, headers }) =>
      createMailboxReceiveRule({
        client: this.client,
        path: { mailbox_id: mailboxId },
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Remove a receive rule.
   *
   * @example Delete a rule
   * await bird.mailboxReceiveRule.delete("mbx_01abc", "erl_01xyz");
   */
  delete(mailboxId: string, ruleId: string, options?: RequestOptions): APIPromise<void> {
    return this.call<void>("DELETE", options, ({ signal, headers }) =>
      deleteMailboxReceiveRule({
        client: this.client,
        path: { mailbox_id: mailboxId, rule_id: ruleId },
        headers,
        signal,
      }),
    );
  }

  /**
   * List receive rules for a mailbox.
   *
   * @example List rules
   * for await (const rule of bird.mailboxReceiveRule.list("mbx_01abc")) {
   *   console.log(rule.action, rule.entry);
   * }
   */
  list(
    mailboxId: string,
    query?: MailboxReceiveRuleListQuery,
    options?: RequestOptions,
  ): PaginatedPromise<ReceiveRule> {
    return this.paginated<ReceiveRule>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listMailboxReceiveRules({
          client: this.client,
          path: { mailbox_id: mailboxId },
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }
}
