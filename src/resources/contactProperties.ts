// `bird.contactProperties` — the contact-properties collection (ADR-0042 §8: a
// collection, plural, with CRUD verbs), gated on the `email_marketing` scope.
// Calls the generated hey-api SDK functions through the lifecycle core.

import {
  archiveContactProperty,
  createContactProperty,
  getContactProperty,
  listContactProperties,
  unarchiveContactProperty,
  updateContactProperty,
} from "../generated/sdk.gen.js";
import type {
  ContactProperty,
  ContactPropertyCreateRequest,
  ContactPropertyUpdateRequest,
  ListContactPropertiesData,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type {
  APIPromise,
  PaginatedPromise,
  RequestOptions,
} from "../core/result.js";

/** A custom contact property (a field that describes contacts). */
export type { ContactProperty };
/** Body for `bird.contactProperties.create`. */
export type ContactPropertyCreateParams = ContactPropertyCreateRequest;
/** Body for `bird.contactProperties.update` — a partial patch. */
export type ContactPropertyUpdateParams = ContactPropertyUpdateRequest;
/** Filters and cursor params for `bird.contactProperties.list`. */
export type ContactPropertyListQuery = NonNullable<
  ListContactPropertiesData["query"]
>;

export class ContactPropertiesResource extends Resource {
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
   * List the workspace's contact properties. `await` resolves the first page;
   * `for await` walks every property across pages.
   *
   * @example
   * for await (const prop of bird.contactProperties.list()) {
   *   console.log(prop.key, prop.type);
   * }
   */
  list(
    query?: ContactPropertyListQuery,
    options?: RequestOptions,
  ): PaginatedPromise<ContactProperty> {
    return this.paginated<ContactProperty>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listContactProperties({
          client: this.client,
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }

  /**
   * Fetch a single contact property by id.
   *
   * @example
   * const prop = await bird.contactProperties.get("cp_01krdgeqcxet5s7t44vh8rt9mg");
   */
  get(
    propertyId: string,
    options?: RequestOptions,
  ): APIPromise<ContactProperty> {
    return this.call<ContactProperty>("GET", options, ({ signal, headers }) =>
      getContactProperty({
        client: this.client,
        path: { property_id: propertyId },
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

  /**
   * Archive a contact property, retiring the field without deleting its data.
   *
   * @example
   * await bird.contactProperties.archive("cp_01krdgeqcxet5s7t44vh8rt9mg");
   */
  archive(
    propertyId: string,
    options?: RequestOptions,
  ): APIPromise<ContactProperty> {
    return this.call<ContactProperty>("POST", options, ({ signal, headers }) =>
      archiveContactProperty({
        client: this.client,
        path: { property_id: propertyId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Restore an archived contact property.
   *
   * @example
   * await bird.contactProperties.unarchive("cp_01krdgeqcxet5s7t44vh8rt9mg");
   */
  unarchive(
    propertyId: string,
    options?: RequestOptions,
  ): APIPromise<ContactProperty> {
    return this.call<ContactProperty>("POST", options, ({ signal, headers }) =>
      unarchiveContactProperty({
        client: this.client,
        path: { property_id: propertyId },
        headers,
        signal,
      }),
    );
  }
}
