// `bird.email.stats` — the email statistics read API, nested under the email
// channel. Every method is a GET that returns an aggregate or a breakdown for a
// time window; none are paginated. Calls the generated hey-api SDK functions
// through the lifecycle core.

import {
  getEmailStatsByBounceCode,
  getEmailStatsByBroadcast,
  getEmailStatsByCategory,
  getEmailStatsByClient,
  getEmailStatsByComplaintType,
  getEmailStatsByLocation,
  getEmailStatsByMailboxProvider,
  getEmailStatsByMailboxProviderRegion,
  getEmailStatsByRecipientDomain,
  getEmailStatsBySendingDomain,
  getEmailStatsBySendingIp,
  getEmailStatsByTag,
  getEmailStatsByTemplate,
  getEmailStatsDaily,
  getEmailStatsHourly,
  getEmailStatsSummary,
} from "../generated/sdk.gen.js";
import type {
  EmailStatsByBounceCodeResponse,
  EmailStatsByBroadcastResponse,
  EmailStatsByCategoryResponse,
  EmailStatsByClientResponse,
  EmailStatsByComplaintTypeResponse,
  EmailStatsByLocationResponse,
  EmailStatsByMailboxProviderRegionResponse,
  EmailStatsByMailboxProviderResponse,
  EmailStatsByRecipientDomainResponse,
  EmailStatsBySendingDomainResponse,
  EmailStatsBySendingIpResponse,
  EmailStatsByTemplateResponse,
  EmailStatsResponse,
  EmailStatsSummary,
  EmailStatsTagsResponse,
  GetEmailStatsByBounceCodeData,
  GetEmailStatsByBroadcastData,
  GetEmailStatsByCategoryData,
  GetEmailStatsByClientData,
  GetEmailStatsByComplaintTypeData,
  GetEmailStatsByLocationData,
  GetEmailStatsByMailboxProviderData,
  GetEmailStatsByMailboxProviderRegionData,
  GetEmailStatsByRecipientDomainData,
  GetEmailStatsBySendingDomainData,
  GetEmailStatsBySendingIpData,
  GetEmailStatsByTagData,
  GetEmailStatsByTemplateData,
  GetEmailStatsDailyData,
  GetEmailStatsHourlyData,
  GetEmailStatsSummaryData,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** Aggregate summary for a period; add `compare: "previous_period"` for deltas. */
export type { EmailStatsSummary };
/** A time series — one row per bucket — shared by `daily` and `hourly`. */
export type { EmailStatsResponse };
/** Per-tag breakdown rows for a period. */
export type { EmailStatsTagsResponse };
/** Per-category breakdown rows for a period. */
export type { EmailStatsByCategoryResponse };
/** Per-sending-IP breakdown rows for a period. */
export type { EmailStatsBySendingIpResponse };
/** Per-sending-domain breakdown rows for a period. */
export type { EmailStatsBySendingDomainResponse };
/** Per-recipient-domain breakdown rows for a period. */
export type { EmailStatsByRecipientDomainResponse };
/** Per-mailbox-provider breakdown rows for a period. */
export type { EmailStatsByMailboxProviderResponse };
/** Per-mailbox-provider-region breakdown rows for a period. */
export type { EmailStatsByMailboxProviderRegionResponse };
/** Per-template breakdown rows for a period. */
export type { EmailStatsByTemplateResponse };
/** Per-location breakdown rows for a period. */
export type { EmailStatsByLocationResponse };
/** Per-client (opening application) breakdown rows for a period. */
export type { EmailStatsByClientResponse };
/** Per-bounce-code breakdown rows for a period. */
export type { EmailStatsByBounceCodeResponse };
/** Per-complaint-type breakdown rows for a period. */
export type { EmailStatsByComplaintTypeResponse };
/** Per-broadcast breakdown rows for a period. */
export type { EmailStatsByBroadcastResponse };

/** Query params for `bird.email.stats.summary`. */
export type EmailStatsSummaryQuery = NonNullable<
  GetEmailStatsSummaryData["query"]
>;
/** Query params for `bird.email.stats.daily`. */
export type EmailStatsDailyQuery = NonNullable<GetEmailStatsDailyData["query"]>;
/** Query params for `bird.email.stats.hourly`. */
export type EmailStatsHourlyQuery = NonNullable<
  GetEmailStatsHourlyData["query"]
>;
/** Query params for `bird.email.stats.byTag`. */
export type EmailStatsByTagQuery = NonNullable<GetEmailStatsByTagData["query"]>;
/** Query params for `bird.email.stats.byCategory`. */
export type EmailStatsByCategoryQuery = NonNullable<
  GetEmailStatsByCategoryData["query"]
>;
/** Query params for `bird.email.stats.bySendingIp`. */
export type EmailStatsBySendingIpQuery = NonNullable<
  GetEmailStatsBySendingIpData["query"]
>;
/** Query params for `bird.email.stats.bySendingDomain`. */
export type EmailStatsBySendingDomainQuery = NonNullable<
  GetEmailStatsBySendingDomainData["query"]
>;
/** Query params for `bird.email.stats.byRecipientDomain`. */
export type EmailStatsByRecipientDomainQuery = NonNullable<
  GetEmailStatsByRecipientDomainData["query"]
>;
/** Query params for `bird.email.stats.byMailboxProvider`. */
export type EmailStatsByMailboxProviderQuery = NonNullable<
  GetEmailStatsByMailboxProviderData["query"]
>;
/** Query params for `bird.email.stats.byMailboxProviderRegion`. */
export type EmailStatsByMailboxProviderRegionQuery = NonNullable<
  GetEmailStatsByMailboxProviderRegionData["query"]
>;
/** Query params for `bird.email.stats.byTemplate`. */
export type EmailStatsByTemplateQuery = NonNullable<
  GetEmailStatsByTemplateData["query"]
>;
/** Query params for `bird.email.stats.byLocation`. */
export type EmailStatsByLocationQuery = NonNullable<
  GetEmailStatsByLocationData["query"]
>;
/** Query params for `bird.email.stats.byClient`. */
export type EmailStatsByClientQuery = NonNullable<
  GetEmailStatsByClientData["query"]
>;
/** Query params for `bird.email.stats.byBounceCode`. */
export type EmailStatsByBounceCodeQuery = NonNullable<
  GetEmailStatsByBounceCodeData["query"]
>;
/** Query params for `bird.email.stats.byComplaintType`. */
export type EmailStatsByComplaintTypeQuery = NonNullable<
  GetEmailStatsByComplaintTypeData["query"]
>;
/** Query params for `bird.email.stats.byBroadcast`. */
export type EmailStatsByBroadcastQuery = NonNullable<
  GetEmailStatsByBroadcastData["query"]
>;

/**
 * `bird.email.stats` — read-only email statistics. Every method takes an
 * optional query object (window, timezone, and — for breakdowns — `limit` and
 * `sort`) and resolves the typed aggregate or breakdown for that window. These
 * are point reads, not cursor lists, so each returns an `APIPromise`, not a
 * paginated iterator. Reached as `bird.email.stats.*`.
 */
export class EmailStatsResource extends Resource {
  /**
   * Aggregate delivery, engagement, and latency for a window. Pass
   * `compare: "previous_period"` to also get the preceding window and the
   * change between the two.
   *
   * @example Summary for a month
   * const s = await bird.email.stats.summary({ from: "2026-05-01", to: "2026-05-31" });
   * console.log(s.sends_accepted, s.delivery.delivered);
   */
  summary(
    query?: EmailStatsSummaryQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsSummary> {
    return this.call<EmailStatsSummary>("GET", options, ({ signal, headers }) =>
      getEmailStatsSummary({ client: this.client, query, headers, signal }),
    );
  }

  /**
   * Daily time series — one row per calendar day in the window.
   *
   * @example Per-day series for a month
   * const series = await bird.email.stats.daily({ from: "2026-05-01", to: "2026-05-31" });
   * for (const row of series.data) console.log(row.bucket, row.delivery.delivered);
   */
  daily(
    query?: EmailStatsDailyQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsResponse> {
    return this.call<EmailStatsResponse>("GET", options, ({ signal, headers }) =>
      getEmailStatsDaily({ client: this.client, query, headers, signal }),
    );
  }

  /**
   * Hourly time series — one row per hour in the window (max 720 hours).
   *
   * @example Per-hour series for a day
   * const series = await bird.email.stats.hourly({ from: "2026-05-01", to: "2026-05-02" });
   * for (const row of series.data) console.log(row.bucket, row.delivery.delivered);
   */
  hourly(
    query?: EmailStatsHourlyQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsResponse> {
    return this.call<EmailStatsResponse>("GET", options, ({ signal, headers }) =>
      getEmailStatsHourly({ client: this.client, query, headers, signal }),
    );
  }

  /**
   * Breakdown by tag, ranked by `sort` (default `processed`) descending.
   *
   * @example Top 10 tags by delivered
   * const { data } = await bird.email.stats.byTag({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   sort: "delivered",
   *   limit: 10,
   * });
   * for (const row of data) console.log(row.tag, row.delivery.delivered);
   */
  byTag(
    query?: EmailStatsByTagQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsTagsResponse> {
    return this.call<EmailStatsTagsResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByTag({ client: this.client, query, headers, signal }),
    );
  }

  /**
   * Breakdown by category (`transactional` / `marketing`).
   *
   * @example By category for a month
   * const { data } = await bird.email.stats.byCategory({ from: "2026-05-01", to: "2026-05-31" });
   * for (const row of data) console.log(row.category, row.delivery.delivered);
   */
  byCategory(
    query?: EmailStatsByCategoryQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByCategoryResponse> {
    return this.call<EmailStatsByCategoryResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByCategory({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by sending IP, ranked by `sort` (default `delivered`) descending.
   *
   * @example IPs with the most block bounces
   * const { data } = await bird.email.stats.bySendingIp({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   sort: "bounces.block",
   *   limit: 20,
   * });
   * for (const row of data) console.log(row.sending_ip, row.delivery.delivered);
   */
  bySendingIp(
    query?: EmailStatsBySendingIpQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsBySendingIpResponse> {
    return this.call<EmailStatsBySendingIpResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsBySendingIp({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by sending domain.
   *
   * @example By sending domain
   * const { data } = await bird.email.stats.bySendingDomain({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   sort: "delivery_rate",
   *   limit: 25,
   * });
   * for (const row of data) console.log(row.sending_domain, row.delivery.delivery_rate);
   */
  bySendingDomain(
    query?: EmailStatsBySendingDomainQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsBySendingDomainResponse> {
    return this.call<EmailStatsBySendingDomainResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsBySendingDomain({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by recipient mailbox domain (e.g. `gmail.com`).
   *
   * @example Recipient domains with the highest bounce rate
   * const { data } = await bird.email.stats.byRecipientDomain({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   sort: "bounce_rate",
   *   limit: 25,
   * });
   * for (const row of data) console.log(row.recipient_domain, row.delivery.bounce_rate);
   */
  byRecipientDomain(
    query?: EmailStatsByRecipientDomainQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByRecipientDomainResponse> {
    return this.call<EmailStatsByRecipientDomainResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByRecipientDomain({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by mailbox provider (e.g. Google, Microsoft).
   *
   * @example By mailbox provider
   * const { data } = await bird.email.stats.byMailboxProvider({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   limit: 25,
   * });
   * for (const row of data) console.log(row.mailbox_provider, row.delivery.delivered);
   */
  byMailboxProvider(
    query?: EmailStatsByMailboxProviderQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByMailboxProviderResponse> {
    return this.call<EmailStatsByMailboxProviderResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByMailboxProvider({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by mailbox provider and region.
   *
   * @example By mailbox provider and region
   * const { data } = await bird.email.stats.byMailboxProviderRegion({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   limit: 25,
   * });
   * for (const row of data) console.log(row.mailbox_provider, row.mailbox_provider_region, row.delivery.delivered);
   */
  byMailboxProviderRegion(
    query?: EmailStatsByMailboxProviderRegionQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByMailboxProviderRegionResponse> {
    return this.call<EmailStatsByMailboxProviderRegionResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByMailboxProviderRegion({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by template (by `emt_…` ID or name).
   *
   * @example By template
   * const { data } = await bird.email.stats.byTemplate({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   sort: "open_rate",
   *   limit: 25,
   * });
   * for (const row of data) console.log(row.template_id, row.engagement.open_rate);
   */
  byTemplate(
    query?: EmailStatsByTemplateQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByTemplateResponse> {
    return this.call<EmailStatsByTemplateResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByTemplate({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by recipient geographic location.
   *
   * @example By location
   * const { data } = await bird.email.stats.byLocation({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   limit: 25,
   * });
   * for (const row of data) console.log(row.country, row.engagement.unique_opens);
   */
  byLocation(
    query?: EmailStatsByLocationQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByLocationResponse> {
    return this.call<EmailStatsByLocationResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByLocation({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by opening client (the application that opened the message).
   *
   * @example By client
   * const { data } = await bird.email.stats.byClient({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   limit: 25,
   * });
   * for (const row of data) console.log(row.email_client, row.engagement.unique_opens);
   */
  byClient(
    query?: EmailStatsByClientQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByClientResponse> {
    return this.call<EmailStatsByClientResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByClient({ client: this.client, query, headers, signal }),
    );
  }

  /**
   * Breakdown by bounce code — which SMTP/enhanced codes drove bounces.
   *
   * @example By bounce code
   * const { data } = await bird.email.stats.byBounceCode({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   sort: "bounced",
   *   limit: 25,
   * });
   * for (const row of data) console.log(row.smtp_error_code, row.bounced);
   */
  byBounceCode(
    query?: EmailStatsByBounceCodeQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByBounceCodeResponse> {
    return this.call<EmailStatsByBounceCodeResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByBounceCode({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by complaint type.
   *
   * @example By complaint type
   * const { data } = await bird.email.stats.byComplaintType({ from: "2026-05-01", to: "2026-05-31" });
   * for (const row of data) console.log(row.feedback_type, row.complained);
   */
  byComplaintType(
    query?: EmailStatsByComplaintTypeQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByComplaintTypeResponse> {
    return this.call<EmailStatsByComplaintTypeResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByComplaintType({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }

  /**
   * Breakdown by broadcast.
   *
   * @example By broadcast
   * const { data } = await bird.email.stats.byBroadcast({
   *   from: "2026-05-01",
   *   to: "2026-05-31",
   *   sort: "click_rate",
   *   limit: 25,
   * });
   * for (const row of data) console.log(row.broadcast_id, row.engagement.click_rate);
   */
  byBroadcast(
    query?: EmailStatsByBroadcastQuery,
    options?: RequestOptions,
  ): APIPromise<EmailStatsByBroadcastResponse> {
    return this.call<EmailStatsByBroadcastResponse>(
      "GET",
      options,
      ({ signal, headers }) =>
        getEmailStatsByBroadcast({
          client: this.client,
          query,
          headers,
          signal,
        }),
    );
  }
}
