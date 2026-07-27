// `bird.contacts` — the contacts collection (ADR-0042 §8: a collection, plural,
// with CRUD verbs), gated on the `email_marketing` scope. `get`, `create`,
// `delete`, and `list` are generated (contacts.gen.ts); `update` and `batch` are
// hand-written here because they carry craft the generator does not express:
// a partial patch and a batch upsert.

import {
  createContactBatch,
  updateContact,
} from "../generated/sdk.gen.js";
import type {
  Contact,
  ContactUpdateRequest,
  ContactUpsertRequest,
  ContactUpsertResult,
} from "../generated/types.gen.js";
import { ContactsResourceBase } from "./contacts.gen.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** A workspace contact, the create body, and the list filters. */
export type { Contact, ContactCreateParams, ContactListQuery } from "./contacts.gen.js";
/** Body for `bird.contacts.update` — a partial patch. */
export type ContactUpdateParams = ContactUpdateRequest;
/** Body for `bird.contacts.batch` — create-or-update many contacts in one call. */
export type ContactBatchParams = ContactUpsertRequest;
/** The batch upsert result. */
export type { ContactUpsertResult };

export class ContactsResource extends ContactsResourceBase {
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
