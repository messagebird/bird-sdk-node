// `bird.domains` — the sending-domains collection (ADR-0042 §8: a collection,
// plural, with CRUD verbs) plus a `verify` action, gated on the `domains` scope.
// Register a domain, publish the returned DNS records, then verify until it is
// usable as a sender. Calls the generated hey-api SDK functions through the
// lifecycle core.

import {
  createDomain,
  deleteDomain,
  getDomain,
  listDomains,
  updateDomain,
  verifyDomain,
} from "../generated/sdk.gen.js";
import type {
  Domain,
  DomainCapabilities,
  DomainCreate,
  DomainDkim,
  DomainUpdate,
  DnsRecord,
  ListDomainsData,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type {
  APIPromise,
  PaginatedPromise,
  RequestOptions,
} from "../core/result.js";

/** A sending domain: verification status, per-record DNS state, and capabilities. */
export type { Domain };
/** One of a domain's DNS records and its individual verification state. */
export type { DnsRecord };
/** Active DKIM signing configuration on a domain. */
export type { DomainDkim };
/** Per-capability readiness (sending, tracking, return-path, inbound, DMARC). */
export type { DomainCapabilities };
/** Body for `bird.domains.create`. */
export type DomainCreateParams = DomainCreate;
/**
 * Body for `bird.domains.update` — a partial patch. Omit a field to leave it
 * unchanged; send `tracking: null` to remove the tracking domain (both tracking
 * toggles must be off first, else the API returns 409).
 */
export type DomainUpdateParams = DomainUpdate;
/** Filters and cursor params for `bird.domains.list`. */
export type DomainListQuery = NonNullable<ListDomainsData["query"]>;

export class DomainsResource extends Resource {
  /**
   * Register a sending domain. Returns it in `pending` with the `dns_records`
   * to publish at your DNS provider; call `verify` once they are in place.
   *
   * @example Register a sending domain
   * const domain = await bird.domains.create({ domain: "mail.acme.com" });
   * console.log(domain.id, domain.status); // "dom_…", "pending"
   */
  create(
    params: DomainCreateParams,
    options?: RequestOptions,
  ): APIPromise<Domain> {
    return this.call<Domain>("POST", options, ({ signal, headers }) =>
      createDomain({ client: this.client, body: params, headers, signal }),
    );
  }

  /**
   * List the workspace's sending domains, newest first. `await` resolves the
   * first page; `for await` walks every domain across pages.
   *
   * @example
   * for await (const domain of bird.domains.list()) {
   *   console.log(domain.id, domain.status);
   * }
   */
  list(
    query?: DomainListQuery,
    options?: RequestOptions,
  ): PaginatedPromise<Domain> {
    return this.paginated<Domain>(
      "GET",
      options,
      ({ signal, headers }, cursor) =>
        listDomains({
          client: this.client,
          query: { ...query, starting_after: cursor ?? query?.starting_after },
          headers,
          signal,
        }),
    );
  }

  /**
   * Fetch a single sending domain by id, with its DNS records and their
   * per-record verification state.
   *
   * @example
   * const domain = await bird.domains.get("dom_01krdgeqcxet5s7t44vh8rt9mg");
   */
  get(domainId: string, options?: RequestOptions): APIPromise<Domain> {
    return this.call<Domain>("GET", options, ({ signal, headers }) =>
      getDomain({
        client: this.client,
        path: { domain_id: domainId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Update a sending domain. Only the fields you send change; `settings` apply
   * immediately, while `return_path`/`tracking`/`dkim` changes are staged until
   * their new DNS records verify.
   *
   * @example
   * await bird.domains.update("dom_01krdgeqcxet5s7t44vh8rt9mg", {
   *   settings: { click_tracking: true, open_tracking: true },
   *   tracking: { name: "links" },
   * });
   */
  update(
    domainId: string,
    params: DomainUpdateParams,
    options?: RequestOptions,
  ): APIPromise<Domain> {
    return this.call<Domain>("PATCH", options, ({ signal, headers }) =>
      updateDomain({
        client: this.client,
        path: { domain_id: domainId },
        body: params,
        headers,
        signal,
      }),
    );
  }

  /**
   * Delete a sending domain. Mail already accepted still sends; you can no
   * longer send new mail from it.
   *
   * @example
   * await bird.domains.delete("dom_01krdgeqcxet5s7t44vh8rt9mg");
   */
  delete(domainId: string, options?: RequestOptions): APIPromise<void> {
    return this.call<void>("DELETE", options, ({ signal, headers }) =>
      deleteDomain({
        client: this.client,
        path: { domain_id: domainId },
        headers,
        signal,
      }),
    );
  }

  /**
   * Trigger a fresh DNS check and return the refreshed domain with per-record
   * results. Safe to repeat while waiting for DNS to propagate.
   *
   * @example
   * const domain = await bird.domains.verify("dom_01krdgeqcxet5s7t44vh8rt9mg");
   * console.log(domain.status); // "verified" once DNS is in place
   */
  verify(domainId: string, options?: RequestOptions): APIPromise<Domain> {
    return this.call<Domain>("POST", options, ({ signal, headers }) =>
      verifyDomain({
        client: this.client,
        path: { domain_id: domainId },
        headers,
        signal,
      }),
    );
  }
}
