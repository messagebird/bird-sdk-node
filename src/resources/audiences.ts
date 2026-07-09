// `bird.audiences` — the audiences collection (ADR-0042 §8: a collection,
// plural, with CRUD verbs) plus membership management, gated on the
// `email_marketing` scope. Calls the generated hey-api SDK functions through the
// lifecycle core.

import {
  assignAudienceContacts,
  createAudience,
  deleteAudience,
  getAudience,
  listAudienceContacts,
  listAudiences,
  unassignAudienceContact,
  unassignAudienceContacts,
  updateAudience,
} from "../generated/sdk.gen.js";
import type {
  Audience,
  AudienceContactsAddRequest,
  AudienceContactsRemoveRequest,
  AudienceCreateRequest,
  AudienceMember,
  AudienceUpdateRequest,
  ListAudienceContactsData,
  ListAudiencesData,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type {
  APIPromise,
  PaginatedPromise,
  RequestOptions,
} from "../core/result.js";

/** A workspace audience — a named group of contacts. */
export type { Audience };
/** A contact's membership in an audience. */
export type { AudienceMember };
/** Body for `bird.audiences.create`. */
export type AudienceCreateParams = AudienceCreateRequest;
/** Body for `bird.audiences.update` — a partial patch. */
export type AudienceUpdateParams = AudienceUpdateRequest;
/** Body for `bird.audiences.addContacts`. */
export type AudienceAddContactsParams = AudienceContactsAddRequest;
/** Body for `bird.audiences.removeContacts`. */
export type AudienceRemoveContactsParams = AudienceContactsRemoveRequest;
/** Filters and cursor params for `bird.audiences.list`. */
export type AudienceListQuery = NonNullable<ListAudiencesData["query"]>;
/** Cursor params for `bird.audiences.listContacts`. */
export type AudienceContactsQuery = NonNullable<
  ListAudienceContactsData["query"]
>;

export class AudiencesResource extends Resource {
  /**
   * Create an audience.
   *
   * @example Create an audience
   * const audience = await bird.audiences.create({ name: "Newsletter subscribers" });
   * console.log(audience.id); // "aud_…"
   */
  create(
    params: AudienceCreateParams,
    options?: RequestOptions,
  ): APIPromise<Audience> {
    return this.call<Audience>("POST", options, ({ signal, headers }) =>
      createAudience({ client: this.client, body: params, headers, signal }),
    );
  }

  /**
   * List the workspace's audiences, newest first. `await` resolves the first
   * page; `for await` walks every audience across pages.
   *
   * @example
   * for await (const audience of bird.audiences.list()) {
   *   console.log(audience.id, audience.name);
   * }
   */
  list(
    query?: AudienceListQuery,
    options?: RequestOptions,
  ): PaginatedPromise<Audience> {
    return this.paginated<Audience>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listAudiences({
          client: this.client,
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }

  /**
   * Fetch a single audience by id.
   *
   * @example
   * const audience = await bird.audiences.get("aud_01krdgeqcxet5s7t44vh8rt9mg");
   */
  get(audienceId: string, options?: RequestOptions): APIPromise<Audience> {
    return this.call<Audience>("GET", options, ({ signal, headers }) =>
      getAudience({
        client: this.client,
        path: { audience_id: audienceId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Update an audience. Only the fields you send change.
   *
   * @example
   * await bird.audiences.update("aud_01krdgeqcxet5s7t44vh8rt9mg", { name: "Renamed" });
   */
  update(
    audienceId: string,
    params: AudienceUpdateParams,
    options?: RequestOptions,
  ): APIPromise<Audience> {
    return this.call<Audience>("PATCH", options, ({ signal, headers }) =>
      updateAudience({
        client: this.client,
        path: { audience_id: audienceId },
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Delete an audience. Its contacts are unaffected.
   *
   * @example
   * await bird.audiences.delete("aud_01krdgeqcxet5s7t44vh8rt9mg");
   */
  delete(audienceId: string, options?: RequestOptions): APIPromise<void> {
    return this.call<void>("DELETE", options, ({ signal, headers }) =>
      deleteAudience({
        client: this.client,
        path: { audience_id: audienceId },
        headers,
        signal,
      }),
    );
  }

  /**
   * List the contacts in an audience, newest first. `await` resolves the first
   * page; `for await` walks every member across pages.
   *
   * @example
   * for await (const member of bird.audiences.listContacts("aud_01krdgeqcxet5s7t44vh8rt9mg")) {
   *   console.log(member.contact_id);
   * }
   */
  listContacts(
    audienceId: string,
    query?: AudienceContactsQuery,
    options?: RequestOptions,
  ): PaginatedPromise<AudienceMember> {
    return this.paginated<AudienceMember>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listAudienceContacts({
          client: this.client,
          path: { audience_id: audienceId },
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }

  /**
   * Add contacts to an audience by id.
   *
   * @example
   * await bird.audiences.addContacts("aud_01krdgeqcxet5s7t44vh8rt9mg", {
   *   contact_ids: ["con_1", "con_2"],
   * });
   */
  addContacts(
    audienceId: string,
    params: AudienceAddContactsParams,
    options?: RequestOptions,
  ): APIPromise<void> {
    return this.call<void>("POST", options, ({ signal, headers }) =>
      assignAudienceContacts({
        client: this.client,
        path: { audience_id: audienceId },
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Remove a set of contacts from an audience.
   *
   * @example
   * await bird.audiences.removeContacts("aud_01krdgeqcxet5s7t44vh8rt9mg", {
   *   contact_ids: ["con_1", "con_2"],
   * });
   */
  removeContacts(
    audienceId: string,
    params: AudienceRemoveContactsParams,
    options?: RequestOptions,
  ): APIPromise<void> {
    return this.call<void>("POST", options, ({ signal, headers }) =>
      unassignAudienceContacts({
        client: this.client,
        path: { audience_id: audienceId },
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Remove a single contact from an audience.
   *
   * @example
   * await bird.audiences.removeContact("aud_01krdgeqcxet5s7t44vh8rt9mg", "con_1");
   */
  removeContact(
    audienceId: string,
    contactId: string,
    options?: RequestOptions,
  ): APIPromise<void> {
    return this.call<void>("DELETE", options, ({ signal, headers }) =>
      unassignAudienceContact({
        client: this.client,
        path: { audience_id: audienceId, contact_id: contactId },
        headers,
        signal,
      }),
    );
  }
}
