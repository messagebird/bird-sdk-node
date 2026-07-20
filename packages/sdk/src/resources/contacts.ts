// `bird.contacts` — the contacts collection (ADR-0042 §8: a collection, plural,
// with CRUD verbs), gated on the `email_marketing` scope. Calls the generated
// hey-api SDK functions through the lifecycle core.

import {
  createContact,
  createContactBatch,
  deleteContact,
  getContact,
  listContacts,
  updateContact,
} from "../generated/sdk.gen.js";
import type {
  Contact,
  ContactCreateRequest,
  ContactList,
  ContactUpdateRequest,
  ContactUpsertRequest,
  ContactUpsertResult,
  ListContactsData,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type {
  APIPromise,
  PaginatedPromise,
  RequestOptions,
} from "../core/result.js";

/** A workspace contact. */
export type { Contact };
/** Body for `bird.contacts.create`. */
export type ContactCreateParams = ContactCreateRequest;
/** Body for `bird.contacts.update` — a partial patch. */
export type ContactUpdateParams = ContactUpdateRequest;
/** Body for `bird.contacts.batch` — create-or-update many contacts in one call. */
export type ContactBatchParams = ContactUpsertRequest;
/** The batch upsert result. */
export type { ContactUpsertResult };
/** Filters and cursor params for `bird.contacts.list`. */
export type ContactListQuery = NonNullable<ListContactsData["query"]>;

export class ContactsResource extends Resource {
  /**
   * Create a contact. `email` is required and unique within the workspace; set
   * custom fields via `data` (each key a property defined in contact properties).
   *
   * @example Create a contact
   * const contact = await bird.contacts.create({
   *   email: "jane@acme.com",
   *   first_name: "Jane",
   * });
   * console.log(contact.id); // "con_…"
   */
  create(
    params: ContactCreateParams,
    options?: RequestOptions,
  ): APIPromise<Contact> {
    return this.call<Contact>("POST", options, ({ signal, headers }) =>
      createContact({ client: this.client, body: params, headers, signal }),
    );
  }

  /**
   * List the workspace's contacts, newest first. `await` resolves the first page;
   * `for await` walks every contact across pages. Filter by `email`,
   * `external_id`, or a `q` search term.
   *
   * @example Iterate every contact, or take one page
   * for await (const contact of bird.contacts.list({ q: "acme.com" })) {
   *   console.log(contact.id, contact.email);
   * }
   * const page = await bird.contacts.list({ limit: 50 }); // page.data, page.next_cursor
   */
  list(
    query?: ContactListQuery,
    options?: RequestOptions,
  ): PaginatedPromise<Contact> {
    return this.paginated<Contact>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listContacts({
          client: this.client,
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }

  /**
   * Fetch a single contact by id.
   *
   * @example
   * const contact = await bird.contacts.get("con_01krdgeqcxet5s7t44vh8rt9mg");
   * contact.email;
   */
  get(contactId: string, options?: RequestOptions): APIPromise<Contact> {
    return this.call<Contact>("GET", options, ({ signal, headers }) =>
      getContact({
        client: this.client,
        path: { contact_id: contactId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Update a contact. Only the fields you send change.
   *
   * @example
   * const contact = await bird.contacts.update("con_01krdgeqcxet5s7t44vh8rt9mg", {
   *   first_name: "Jane",
   * });
   */
  update(
    contactId: string,
    params: ContactUpdateParams,
    options?: RequestOptions,
  ): APIPromise<Contact> {
    return this.call<Contact>("PATCH", options, ({ signal, headers }) =>
      updateContact({
        client: this.client,
        path: { contact_id: contactId },
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Delete a contact by id.
   *
   * @example
   * await bird.contacts.delete("con_01krdgeqcxet5s7t44vh8rt9mg");
   */
  delete(contactId: string, options?: RequestOptions): APIPromise<void> {
    return this.call<void>("DELETE", options, ({ signal, headers }) =>
      deleteContact({
        client: this.client,
        path: { contact_id: contactId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Create or update many contacts in one call, matched by email. Returns a
   * per-contact result.
   *
   * @example
   * const result = await bird.contacts.batch({
   *   contacts: [{ email: "jane@acme.com", first_name: "Jane" }],
   * });
   */
  batch(
    params: ContactBatchParams,
    options?: RequestOptions,
  ): APIPromise<ContactUpsertResult> {
    return this.call<ContactUpsertResult>("POST", options, ({ signal, headers }) =>
      createContactBatch({
        client: this.client,
        body: params,
        headers,
        signal,
      }),
    );
  }
}
