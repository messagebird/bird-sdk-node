import { Emitter } from "./emitter.js";
import {
  CLIENT_EVENT_PREFIX,
  Inbound,
  Outbound,
  UserFacing,
  isInternal,
  type Frame,
} from "./protocol.js";
import { BirdRealtimeError } from "./errors.js";
import type { Authorizer, ChannelAuthResponse, Member } from "./types.js";

export type SendFn = (frame: Frame) => boolean;

/**
 * The subscribe lifecycle. Every transition happens inside this class, and an
 * async continuation (the authorize round-trip) is validated against a
 * monotonic attempt id — state that moved underneath it invalidates it.
 */
type SubscriptionState =
  "idle" | "authorizing" | "pending" | "subscribed" | "failed";

/**
 * A public channel: no authorization. Subscribe/unsubscribe are driven by the
 * client; the channel decodes lifecycle frames and fans application events out
 * to bindings.
 */
export class Channel extends Emitter {
  #state: SubscriptionState = "idle";
  #attempt = 0;

  constructor(
    readonly name: string,
    protected readonly send: SendFn,
  ) {
    super();
  }

  /** True while the server has this channel subscribed. */
  get subscribed(): boolean {
    return this.#state === "subscribed";
  }

  /** Public channels need no auth. Subclasses return an auth payload. */
  async authorize(_connectionId: string): Promise<ChannelAuthResponse | null> {
    return null;
  }

  /**
   * Drive one subscribe attempt: authorize, then send — unless the state moved
   * while authorize was in flight (reconnect, unsubscribe, a server error), in
   * which case the late continuation is dropped. `stillCurrent` is the
   * client's view (same connection id, channel still registered).
   */
  async startSubscribe(
    connectionId: string,
    stillCurrent: () => boolean,
  ): Promise<void> {
    if (this.#state !== "idle" && this.#state !== "failed") return;
    const attempt = ++this.#attempt;
    this.#state = "authorizing";
    let auth: ChannelAuthResponse | null;
    try {
      auth = await this.authorize(connectionId);
    } catch (err) {
      if (attempt === this.#attempt)
        this.handleSubscriptionError({ error: String(err) });
      return;
    }
    if (attempt !== this.#attempt || !stillCurrent()) return;
    // Only the winning attempt gets to act on its auth payload.
    this.acceptAuth(auth);
    const data: Record<string, unknown> = { channel: this.name };
    if (auth) {
      data.auth = auth.auth;
      if (auth.member_data) data.member_data = auth.member_data;
    }
    this.#state = "pending";
    this.send({ event: Outbound.Subscribe, data });
  }

  /**
   * Hook for the accepted (attempt-validated) auth payload — a stale
   * authorize resolution never reaches it, so subclass state derived from
   * auth can't be clobbered by a late continuation.
   */
  protected acceptAuth(_auth: ChannelAuthResponse | null): void {}

  /**
   * Invalidate any in-flight attempt without emitting: the connection dropped
   * (a reconnect re-subscribes) or a connection-level error arrived (the
   * caller may retry).
   */
  invalidateAttempt(): void {
    this.#attempt += 1;
    if (this.#state !== "subscribed") this.#state = "idle";
  }

  /** Trigger a client event (`client-*`). Requires an active subscription. */
  trigger(event: string, data?: unknown): boolean {
    if (!event.startsWith(CLIENT_EVENT_PREFIX)) {
      throw new BirdRealtimeError(
        `Client events must be prefixed with "${CLIENT_EVENT_PREFIX}"`,
      );
    }
    if (this.#state !== "subscribed") return false;
    return this.send({ event, channel: this.name, data });
  }

  /** Route a frame addressed to this channel. Internal frames are consumed. */
  handleEvent(frame: Frame): void {
    switch (frame.event) {
      case Inbound.SubscriptionSucceeded:
        this.#state = "subscribed";
        this.emit(UserFacing.SubscriptionSucceeded);
        return;
      case Inbound.SubscriptionError:
        // The server does not emit channel-scoped rejections today (they
        // arrive as channel-less bird:error frames — see the client). Handled
        // anyway: if the protocol ever grows one, it must fail the channel,
        // not be swallowed as an unknown internal frame.
        this.handleSubscriptionError(frame.data);
        return;
      case Inbound.ConnectionCount:
        this.emit(UserFacing.ConnectionCount, frame.data);
        return;
      default:
        if (isInternal(frame.event)) return; // handled by subclasses or ignored
        this.emit(frame.event, frame.data);
    }
  }

  /** A failed subscription (authorizer error or server rejection). */
  handleSubscriptionError(data?: unknown): void {
    this.#attempt += 1;
    this.#state = "failed";
    this.emit(UserFacing.SubscriptionError, data);
  }

  reset(): void {
    this.#attempt += 1;
    this.#state = "idle";
  }

  /** Subclass hook so PresenceChannel can mark success with its payload. */
  protected markSubscribed(): void {
    this.#state = "subscribed";
  }
}

/** A private channel: subscription is authorized via the configured authorizer. */
export class PrivateChannel extends Channel {
  constructor(
    name: string,
    send: SendFn,
    protected readonly authorizer: Authorizer,
  ) {
    super(name, send);
  }

  override async authorize(
    connectionId: string,
  ): Promise<ChannelAuthResponse | null> {
    return this.authorizer({ connectionId, channelName: this.name });
  }
}

/** A presence channel: authorized like a private channel, plus member tracking. */
export class PresenceChannel extends PrivateChannel {
  readonly members = new Map<string, Member>();
  #myId: string | null = null;
  #pendingMyId: string | null = null;

  /** The local member's id, known once the subscription succeeds. */
  get myId(): string | null {
    return this.#myId;
  }

  protected override acceptAuth(auth: ChannelAuthResponse | null): void {
    // member_data is the customer-signed identity blob; its member_id is us.
    // Held as pending until the server confirms the subscription. Runs only
    // for the attempt-validated auth, so a stale authorize can't clobber it.
    if (!auth?.member_data) return;
    try {
      const d = JSON.parse(auth.member_data) as {
        member_id?: string | number;
      };
      this.#pendingMyId =
        d.member_id === undefined ? null : String(d.member_id);
    } catch {
      this.#pendingMyId = null; // malformed blob; the server will reject it
    }
  }

  override handleEvent(frame: Frame): void {
    switch (frame.event) {
      case Inbound.SubscriptionSucceeded: {
        this.markSubscribed();
        this.#myId = this.#pendingMyId;
        this.loadMembers(frame.data);
        this.emit(UserFacing.SubscriptionSucceeded, { members: this.members });
        return;
      }
      case Inbound.MemberAdded: {
        const m = this.toMember(frame.data);
        if (m) {
          this.members.set(m.member_id, m);
          this.emit(UserFacing.MemberAdded, m);
        }
        return;
      }
      case Inbound.MemberRemoved: {
        const m = this.toMember(frame.data);
        if (m && this.members.delete(m.member_id))
          this.emit(UserFacing.MemberRemoved, m);
        return;
      }
      default:
        super.handleEvent(frame);
    }
  }

  override handleSubscriptionError(data?: unknown): void {
    this.members.clear();
    this.#myId = null;
    this.#pendingMyId = null;
    super.handleSubscriptionError(data);
  }

  override reset(): void {
    super.reset();
    this.members.clear();
    this.#myId = null;
    this.#pendingMyId = null;
  }

  private loadMembers(data: unknown): void {
    this.members.clear();
    const presence = (
      data as { presence?: { ids?: string[]; hash?: Record<string, unknown> } }
    )?.presence;
    if (!presence?.ids) return;
    for (const id of presence.ids) {
      this.members.set(id, { member_id: id, member_info: presence.hash?.[id] });
    }
  }

  private toMember(data: unknown): Member | null {
    const d = data as
      { member_id?: string | number; member_info?: unknown } | undefined;
    if (!d || d.member_id === undefined) return null;
    return { member_id: String(d.member_id), member_info: d.member_info };
  }
}

/** Select the channel implementation from the name prefix. */
export function channelFor(
  name: string,
  send: SendFn,
  authorizer: Authorizer,
): Channel {
  if (name.startsWith("presence-"))
    return new PresenceChannel(name, send, authorizer);
  if (name.startsWith("private-"))
    return new PrivateChannel(name, send, authorizer);
  return new Channel(name, send);
}
