// `bird.emailTemplates` — the email-template collection (ADR-0042 §8: a
// collection, plural, with CRUD verbs). A top-level resource, sibling to the
// `email` channel; the API scopes templates under /v1/email/templates, but the
// SDK keeps the messages channel and the templates collection separate.
// Calls the generated hey-api SDK functions through the lifecycle core.

import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplate,
  getEmailTemplateVersion,
  listEmailTemplates,
  listEmailTemplateVersions,
  publishEmailTemplate,
  updateEmailTemplate,
} from "../generated/sdk.gen.js";
import type {
  EmailTemplate,
  EmailTemplateCreate,
  EmailTemplateSummary,
  EmailTemplateUpdate,
  EmailTemplateVersion,
  EmailTemplateVersionList,
  ListEmailTemplatesData,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type {
  APIPromise,
  PaginatedPromise,
  RequestOptions,
} from "../core/result.js";

/** A template with its current draft content and version pointers. */
export type { EmailTemplate };
/** A template as it appears in a list (no draft content body). */
export type { EmailTemplateSummary };
/** A single template version (a draft, or an immutable published version). */
export type { EmailTemplateVersion };
/** Body for `bird.emailTemplates.create`. */
export type EmailTemplateCreateParams = EmailTemplateCreate;
/** Body for `bird.emailTemplates.update` — a partial patch of the draft. */
export type EmailTemplateUpdateParams = EmailTemplateUpdate;
/** Filters and cursor params for `bird.emailTemplates.list`. */
export type EmailTemplateListQuery = NonNullable<
  ListEmailTemplatesData["query"]
>;

export class EmailTemplatesResource extends Resource {
  /**
   * Create a template and its initial editable draft. Pick the authoring format
   * with `source` (`liquid`, `handlebars`, or `html`); the name must be unique
   * in the workspace or the call throws a `BirdConflictError`.
   *
   * @example Create a template
   * const tpl = await bird.emailTemplates.create({
   *   name: "welcome-email",
   *   description: "Welcome",
   *   category: "transactional",
   *   source: "handlebars",
   *   subject: "Welcome, {{ first_name }}!",
   *   html: "<h1>Hi {{ first_name }}</h1>",
   * });
   * console.log(tpl.id, tpl.revision); // "emt_…", 0
   */
  create(
    params: EmailTemplateCreateParams,
    options?: RequestOptions,
  ): APIPromise<EmailTemplate> {
    return this.call<EmailTemplate>("POST", options, ({ signal, headers }) =>
      createEmailTemplate({
        client: this.client,
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * List the workspace's templates, newest first. `await` resolves the first
   * page; `for await` walks every template across all pages. Filter by
   * `category`, `source`, or a case-insensitive `name` prefix.
   *
   * @example Iterate every template, or take one page
   * for await (const tpl of bird.emailTemplates.list({ category: "transactional" })) {
   *   console.log(tpl.id, tpl.name);
   * }
   * const page = await bird.emailTemplates.list({ limit: 50 }); // page.data, page.next_cursor
   */
  list(
    query?: EmailTemplateListQuery,
    options?: RequestOptions,
  ): PaginatedPromise<EmailTemplateSummary> {
    return this.paginated<EmailTemplateSummary>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listEmailTemplates({
          client: this.client,
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }

  /**
   * Fetch a template with its current draft content (subject, HTML, text), the
   * draft `revision`, and its draft/published version ids.
   *
   * @example
   * const tpl = await bird.emailTemplates.get("emt_abc123");
   * tpl.subject;
   * tpl.published_version_id; // null until first publish
   */
  get(templateId: string, options?: RequestOptions): APIPromise<EmailTemplate> {
    return this.call<EmailTemplate>("GET", options, ({ signal, headers }) =>
      getEmailTemplate({
        client: this.client,
        path: { template_id: templateId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Update a template's metadata and draft content. Only the fields you send
   * change. Pass the draft `revision` you last read; if another edit landed
   * first the call throws a `BirdConflictError` — reload and retry.
   *
   * @example Edit the draft, guarded by the revision you read
   * const tpl = await bird.emailTemplates.get("emt_abc123");
   * const updated = await bird.emailTemplates.update("emt_abc123", {
   *   revision: tpl.revision,
   *   subject: "Welcome aboard, {{ first_name }}!",
   * });
   */
  update(
    templateId: string,
    params: EmailTemplateUpdateParams,
    options?: RequestOptions,
  ): APIPromise<EmailTemplate> {
    return this.call<EmailTemplate>("PATCH", options, ({ signal, headers }) =>
      updateEmailTemplate({
        client: this.client,
        path: { template_id: templateId },
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Delete a template and all its versions. The name becomes available for
   * reuse in the workspace.
   *
   * @example
   * await bird.emailTemplates.delete("emt_abc123");
   */
  delete(templateId: string, options?: RequestOptions): APIPromise<void> {
    return this.call<void>("DELETE", options, ({ signal, headers }) =>
      deleteEmailTemplate({
        client: this.client,
        path: { template_id: templateId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Publish the current draft as a new immutable, numbered version and make it
   * the live version used by sends. The draft stays editable. The draft must
   * have a subject and a body, or the call throws.
   *
   * @example Publish, then send by template
   * const version = await bird.emailTemplates.publish("emt_abc123");
   * console.log(version.version_number); // 1, 2, 3…
   * await bird.email.send({
   *   from: "hello@acme.com",
   *   to: ["alice@example.com"],
   *   template: { id: "emt_abc123", parameters: { first_name: "Alice" } },
   * });
   */
  publish(
    templateId: string,
    options?: RequestOptions,
  ): APIPromise<EmailTemplateVersion> {
    return this.call<EmailTemplateVersion>(
      "POST",
      options,
      ({ signal, headers }) =>
        publishEmailTemplate({
          client: this.client,
          path: { template_id: templateId },
          headers,
          signal,
        }),
    );
  }

  /**
   * List every version of a template — the current draft plus all published
   * versions — newest first. Returns the full set in one response (`.data`);
   * this list is not paginated.
   *
   * @example
   * const { data } = await bird.emailTemplates.listVersions("emt_abc123");
   * for (const v of data) console.log(v.version_number, v.status);
   */
  listVersions(
    templateId: string,
    options?: RequestOptions,
  ): APIPromise<EmailTemplateVersionList> {
    return this.call<EmailTemplateVersionList>(
      "GET",
      options,
      ({ signal, headers }) =>
        listEmailTemplateVersions({
          client: this.client,
          path: { template_id: templateId },
          headers,
          signal,
        }),
    );
  }

  /**
   * Fetch a single version of a template.
   *
   * @example
   * const version = await bird.emailTemplates.getVersion("emt_abc123", "emv_def456");
   * version.status; // "draft" | "published"
   */
  getVersion(
    templateId: string,
    versionId: string,
    options?: RequestOptions,
  ): APIPromise<EmailTemplateVersion> {
    return this.call<EmailTemplateVersion>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailTemplateVersion({
          client: this.client,
          path: { template_id: templateId, version_id: versionId },
          headers,
          signal,
        }),
    );
  }
}
