// `bird.contactProperties` — the contact-properties collection (ADR-0042 §8: a
// collection, plural, with CRUD verbs), gated on the `email_marketing` scope.

import {
  createContactProperty,
  updateContactProperty,
} from "../generated/sdk.gen.js";
import type {
  ContactProperty,
  ContactPropertyCreateRequest,
  ContactPropertyUpdateRequest,
} from "../generated/types.gen.js";
import { ContactPropertiesResourceBase } from "./contactProperties.gen.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** A custom contact property, and the list filters. */
export type { ContactProperty, ContactPropertyListQuery } from "./contactProperties.gen.js";
/** Body for `bird.contactProperties.create`. */
export type ContactPropertyCreateParams = ContactPropertyCreateRequest;
/** Body for `bird.contactProperties.update` — a partial patch. */
export type ContactPropertyUpdateParams = ContactPropertyUpdateRequest;

export class ContactPropertiesResource extends ContactPropertiesResourceBase {
  /**
   * Define a contact property. The `key` must be unique in the workspace and is
   * how contacts reference the field in their `data`.
   *
   * @example
   * const prop = await bird.contactProperties.create({ key: "plan", type: "string" });
   * console.log(prop.id); // "cp_…"
   */
  create(
    params: ContactPropertyCreateParams,
    options?: RequestOptions,
  ): APIPromise<ContactProperty> {
    return this.call<ContactProperty>("POST", options, ({ signal, headers }) =>
      createContactProperty({
        client: this.client,
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Update a contact property. Only the fields you send change.
   *
   * @example
   * await bird.contactProperties.update("cp_01krdgeqcxet5s7t44vh8rt9mg", { fallback_value: "free" });
   */
  update(
    propertyId: string,
    params: ContactPropertyUpdateParams,
    options?: RequestOptions,
  ): APIPromise<ContactProperty> {
    return this.call<ContactProperty>("PATCH", options, ({ signal, headers }) =>
      updateContactProperty({
        client: this.client,
        path: { property_id: propertyId },
        body: params,
        headers,
        signal,
      }),
    );
  }
}
