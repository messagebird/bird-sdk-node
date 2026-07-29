// `bird.realtime` — the Realtime channel (ADR-0042 §8: a capability namespace,
// singular, that acts with `publish`), plus the `channels` and `members`
// collections nested under it. Calls the generated hey-api SDK functions through
// the lifecycle core.
//
// Every Realtime operation authenticates to the Realtime edge with the app's own
// key/secret pair on top of the workspace API key. Those are credentials, so
// they are client config (`realtime: { key, secret }`), not positional args —
// the same shape the webhooks signing secret uses — and each method may override
// them per call through its trailing options.

import {
  disconnectRealtimeAppMember,
  getRealtimeAppChannel,
  listRealtimeAppChannelMembers,
  listRealtimeAppChannels,
  publishRealtimeAppBatch,
  publishRealtimeAppEvent,
} from "../generated/sdk.gen.js";
import type {
  GetRealtimeAppChannelData,
  ListRealtimeAppChannelsData,
  RealtimeBatchPublish,
  RealtimeBatchPublishResult,
  RealtimeChannelInclude,
  RealtimeChannelInfo,
  RealtimeChannelListItem,
  RealtimeChannelMember,
  RealtimeChannelMembers,
  RealtimeChannelsList,
  RealtimePublish,
  RealtimePublishResult,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** Result of `bird.realtime.publish` — the event was accepted and fanned out. */
export type { RealtimePublishResult };
/** Result of `bird.realtime.publishBatch` — one entry per submitted event. */
export type { RealtimeBatchPublishResult };
/** The app's occupied channels. Not paginated — one response holds them all. */
export type { RealtimeChannelsList };
/** A row of `bird.realtime.channels.list`. */
export type { RealtimeChannelListItem };
/** A single channel's occupancy and requested counts. */
export type { RealtimeChannelInfo };
/** The member ids currently subscribed to a presence channel. */
export type { RealtimeChannelMembers };
/** One member of a presence channel — id only; `member_info` is realtime-only. */
export type { RealtimeChannelMember };
/** Per-channel attribute a caller can ask for via `include`. */
export type { RealtimeChannelInclude };

/** Body for `bird.realtime.publish` — one event to one or more channels. */
export type RealtimePublishParams = RealtimePublish;
/** Body for `bird.realtime.publishBatch` — up to 10 events, one channel each. */
export type RealtimeBatchPublishParams = RealtimeBatchPublish;
/** Query params for `bird.realtime.channels.list`. */
export type RealtimeChannelsListQuery = NonNullable<
  ListRealtimeAppChannelsData["query"]
>;
/** Query params for `bird.realtime.channels.get`. */
export type RealtimeChannelGetQuery = NonNullable<
  GetRealtimeAppChannelData["query"]
>;

/**
 * Realtime app credentials — `new BirdClient({ realtime: { key, secret } })`.
 * They come from the app's credentials (shown once at creation) and must belong
 * to the calling workspace. Any Realtime method takes the same pair in its
 * trailing options to override the configured one for a single call — the way
 * to talk to a second app without a second client.
 */
export interface RealtimeOptions {
  /** The Realtime app key, sent as `X-Realtime-Key`. */
  key?: string;
  /** The Realtime app secret, sent as `X-Realtime-Secret`. */
  secret?: string;
}

/** Per-call options for a Realtime method: the usual request options plus a credential override. */
export interface RealtimeRequestOptions
  extends RequestOptions,
    RealtimeOptions {}

/** The resolved credential headers, in wire form. */
interface RealtimeAuthHeaders {
  "X-Realtime-Key": string;
  "X-Realtime-Secret": string;
}

// Shared by the namespace and its nested collections: holds the configured app
// credentials and resolves them (per-call override wins) into wire headers.
abstract class RealtimeBase extends Resource {
  readonly #config?: RealtimeOptions;

  constructor(
    core: ConstructorParameters<typeof Resource>[0],
    client: ConstructorParameters<typeof Resource>[1],
    config?: RealtimeOptions,
  ) {
    super(core, client);
    this.#config = config;
  }

  /**
   * Resolve the app credentials for one call. Called eagerly at the top of each
   * method so a missing credential throws before the lifecycle starts — never
   * as a rejected promise after a request is already in flight.
   */
  protected auth(options?: RealtimeOptions): RealtimeAuthHeaders {
    const key = options?.key ?? this.#config?.key;
    const secret = options?.secret ?? this.#config?.secret;
    if (!key || !secret) {
      throw new Error(
        "No Realtime app credentials. Set `realtime: { key, secret }` on the client, " +
          "or pass `{ key, secret }` in the call options.",
      );
    }
    return { "X-Realtime-Key": key, "X-Realtime-Secret": secret };
  }
}

/**
 * `bird.realtime.channels` — reads the app's live channel state. Channels exist
 * implicitly: one appears when the first connection subscribes and vanishes when
 * the last one leaves, so these report occupancy, never existence.
 */
export class RealtimeChannelsResource extends RealtimeBase {
  /**
   * List the app's currently occupied channels, optionally filtered by name
   * prefix. The Realtime service returns them all in one response — this is a
   * point read, not a cursor list, so there is nothing to iterate.
   *
   * @example List the occupied presence channels with their member counts
   * const { data } = await bird.realtime.channels.list("rap_01krdgeqcxet5s7t44vh8rt9mg", {
   *   prefix: "presence-",
   *   include: ["member_count"],
   * });
   * for (const channel of data) console.log(channel.name, channel.member_count);
   */
  list(
    appId: string,
    query?: RealtimeChannelsListQuery,
    options?: RealtimeRequestOptions,
  ): APIPromise<RealtimeChannelsList> {
    const auth = this.auth(options);
    return this.call<RealtimeChannelsList>(
      "GET",
      options,
      ({ signal, headers }) =>
        listRealtimeAppChannels({
          client: this.client,
          path: { realtime_app_id: appId },
          query,
          headers: { ...headers, ...auth },
          signal,
        }),
    );
  }

  /**
   * Read one channel's state. An unknown or never-used name is not an error —
   * it resolves with `occupied: false`.
   *
   * @example Check whether anyone is in a channel
   * const channel = await bird.realtime.channels.get(
   *   "rap_01krdgeqcxet5s7t44vh8rt9mg",
   *   "presence-lobby",
   *   { include: ["member_count"] },
   * );
   * console.log(channel.occupied, channel.member_count);
   */
  get(
    appId: string,
    channelName: string,
    query?: RealtimeChannelGetQuery,
    options?: RealtimeRequestOptions,
  ): APIPromise<RealtimeChannelInfo> {
    const auth = this.auth(options);
    return this.call<RealtimeChannelInfo>(
      "GET",
      options,
      ({ signal, headers }) =>
        getRealtimeAppChannel({
          client: this.client,
          path: { realtime_app_id: appId, channel_name: channelName },
          query,
          headers: { ...headers, ...auth },
          signal,
        }),
    );
  }

  /**
   * List the member ids subscribed to a presence channel. Ids only — the
   * `member_info` your authorization endpoint attaches is delivered to subscribed
   * clients over the realtime connection and is not available over REST.
   *
   * @example Who is in the lobby
   * const { members } = await bird.realtime.channels.members(
   *   "rap_01krdgeqcxet5s7t44vh8rt9mg",
   *   "presence-lobby",
   * );
   * for (const member of members) console.log(member.member_id);
   */
  members(
    appId: string,
    channelName: string,
    options?: RealtimeRequestOptions,
  ): APIPromise<RealtimeChannelMembers> {
    const auth = this.auth(options);
    return this.call<RealtimeChannelMembers>(
      "GET",
      options,
      ({ signal, headers }) =>
        listRealtimeAppChannelMembers({
          client: this.client,
          path: { realtime_app_id: appId, channel_name: channelName },
          headers: { ...headers, ...auth },
          signal,
        }),
    );
  }
}

/** `bird.realtime.members` — acts on a member across all of its connections. */
export class RealtimeMembersResource extends RealtimeBase {
  /**
   * Disconnect every active connection a member holds — sign-out, ban, or a
   * revoked session. Resolves once the disconnect is applied; the member may
   * reconnect immediately unless your authorization endpoint refuses them.
   *
   * @example Kick a member off every connection
   * await bird.realtime.members.disconnect("rap_01krdgeqcxet5s7t44vh8rt9mg", "user_42");
   */
  disconnect(
    appId: string,
    memberId: string,
    options?: RealtimeRequestOptions,
  ): APIPromise<void> {
    const auth = this.auth(options);
    return this.call<void>("POST", options, ({ signal, headers }) =>
      disconnectRealtimeAppMember({
        client: this.client,
        path: { realtime_app_id: appId, member_id: memberId },
        headers: { ...headers, ...auth },
        signal,
      }),
    );
  }
}

/**
 * `bird.realtime` — publish events to a Realtime app's channels and inspect its
 * live state. Every method needs the app's key/secret pair: set it once as
 * `realtime: { key, secret }` on the client, or pass `{ key, secret }` in a
 * call's options to reach a different app. Reached as `bird.realtime.*`.
 */
export class RealtimeResource extends RealtimeBase {
  /** Channel state — `bird.realtime.channels.list(...)`, `.get(...)`, `.members(...)`. */
  readonly channels: RealtimeChannelsResource;

  /** Members — `bird.realtime.members.disconnect(...)`. */
  readonly members: RealtimeMembersResource;

  constructor(
    core: ConstructorParameters<typeof Resource>[0],
    client: ConstructorParameters<typeof Resource>[1],
    config?: RealtimeOptions,
  ) {
    super(core, client, config);
    this.channels = new RealtimeChannelsResource(core, client, config);
    this.members = new RealtimeMembersResource(core, client, config);
  }

  /**
   * Publish one event to one or more of the app's channels. Listing several
   * channels broadcasts the same event to all of them in a single call. Resolves
   * once the event is accepted — delivery to connected clients is asynchronous.
   *
   * Pass `exclude_connection_id` to skip the connection that triggered the
   * change, so the originating client doesn't echo its own update.
   *
   * @example Broadcast an event to a channel
   * const result = await bird.realtime.publish("rap_01krdgeqcxet5s7t44vh8rt9mg", {
   *   event: "order.updated",
   *   channels: ["orders", "presence-lobby"],
   *   data: { order_id: "ord_123", status: "shipped" },
   * });
   * console.log(result.data?.length); // one entry per channel
   */
  publish(
    appId: string,
    params: RealtimePublishParams,
    options?: RealtimeRequestOptions,
  ): APIPromise<RealtimePublishResult> {
    const auth = this.auth(options);
    return this.call<RealtimePublishResult>(
      "POST",
      options,
      ({ signal, headers }) =>
        publishRealtimeAppEvent({
          client: this.client,
          path: { realtime_app_id: appId },
          body: params,
          headers: { ...headers, ...auth },
          signal,
        }),
    );
  }

  /**
   * Publish up to 10 events in one request, each to a single channel. Use it to
   * fan different events out at once; to send the *same* event to many channels,
   * use `publish` with several `channels` instead.
   *
   * @example Publish two events in one call
   * await bird.realtime.publishBatch("rap_01krdgeqcxet5s7t44vh8rt9mg", {
   *   events: [
   *     { event: "order.created", channel: "orders", data: { id: 1 } },
   *     { event: "order.updated", channel: "orders", data: { id: 2 } },
   *   ],
   * });
   */
  publishBatch(
    appId: string,
    params: RealtimeBatchPublishParams,
    options?: RealtimeRequestOptions,
  ): APIPromise<RealtimeBatchPublishResult> {
    const auth = this.auth(options);
    return this.call<RealtimeBatchPublishResult>(
      "POST",
      options,
      ({ signal, headers }) =>
        publishRealtimeAppBatch({
          client: this.client,
          path: { realtime_app_id: appId },
          body: params,
          headers: { ...headers, ...auth },
          signal,
        }),
    );
  }
}
