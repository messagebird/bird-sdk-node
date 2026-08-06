// `bird.realtime` — publish to Realtime channels, plus the `channels` and
// `members` collections nested under it.
//
// Every Realtime operation authenticates to the Realtime edge with the app's own
// key/secret pair on top of the workspace API key. Those are credentials, so pass
// them as client config (`realtime: { key, secret }`); the request core stamps
// them on the operations that declare them.

import type {
  RealtimeChannelInclude,
  RealtimeChannelListItem,
  RealtimeChannelMember,
} from "../generated/types.gen.js";
import { RealtimeResourceBase } from "./realtime.gen.js";
import { RealtimeChannelsResource } from "./realtimeChannels.gen.js";
import { RealtimeMembersResource } from "./realtimeMembers.gen.js";
import { Resource } from "./base.js";

export type {
  RealtimePublishBatchParams,
  RealtimeBatchPublishResult,
} from "./realtime.gen.js";

// The rest of the Realtime surface, re-exported here so `bird.realtime`'s public
// types have one import site regardless of which file generates them.
export type { RealtimeChannelInclude, RealtimeChannelListItem, RealtimeChannelMember };
export type {
  RealtimePublishParams,
  RealtimePublishResult,
} from "./realtime.gen.js";
export type {
  RealtimeChannelsList,
  RealtimeChannelInfo,
  RealtimeChannelMembers,
  RealtimeChannelListQuery,
  RealtimeChannelGetQuery,
} from "./realtimeChannels.gen.js";
export type { RealtimeMemberSendParams } from "./realtimeMembers.gen.js";

/**
 * Realtime app credentials — `new BirdClient({ realtime: { key, secret } })`.
 * They come from the app's credentials (shown once at creation) and must belong
 * to the calling workspace.
 */
export interface RealtimeOptions {
  /** The Realtime app key, sent as `X-Realtime-Key`. */
  key?: string;
  /** The Realtime app secret, sent as `X-Realtime-Secret`. */
  secret?: string;
}

/**
 * `bird.realtime` — publish events to a Realtime app's channels and inspect its
 * live state. Reached as `bird.realtime.*`.
 */
export class RealtimeResource extends RealtimeResourceBase {
  /** Channel state — `bird.realtime.channels.list(...)`, `.get(...)`, `.members(...)`. */
  readonly channels: RealtimeChannelsResource;

  /** Members — `bird.realtime.members.send(...)`, `.disconnect(...)`. */
  readonly members: RealtimeMembersResource;

  constructor(
    core: ConstructorParameters<typeof Resource>[0],
    client: ConstructorParameters<typeof Resource>[1],
  ) {
    super(core, client);
    this.channels = new RealtimeChannelsResource(core, client);
    this.members = new RealtimeMembersResource(core, client);
  }

}
