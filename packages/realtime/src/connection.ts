import { Emitter } from "./emitter.js";
import { decode, encode, Inbound, Outbound, type Frame } from "./protocol.js";
import type {
  ConnectionState,
  WebSocketFactory,
  WebSocketLike,
} from "./types.js";

export interface ConnectionOptions {
  activityTimeout?: number;
  pongTimeout?: number;
  /** WebSocket constructor; defaults to the global. Injected in tests. */
  webSocket?: WebSocketFactory;
}

const DEFAULT_ACTIVITY_TIMEOUT = 120_000;
const DEFAULT_PONG_TIMEOUT = 30_000;

// Reconnect backoff: exponential from 1s, capped at 30s, with full jitter so a
// fleet of clients dropped together doesn't reconnect in lockstep.
const BACKOFF_BASE = 1_000;
const BACKOFF_CAP = 30_000;

/**
 * Connection owns a single WebSocket and the reconnection state machine. It
 * emits `state_change` ({ previous, current }), a bare event per state, and
 * `message` (a decoded application/lifecycle frame) for the client to route.
 *
 * Event names (`state_change`, `connecting_in`) are deliberately snake_case:
 * they are the vocabulary realtime clients in this space already speak, so a
 * migrating app's bindings keep working — recorded as a decision, not drift.
 */
export class Connection extends Emitter {
  state: ConnectionState = "initialized";
  connectionId: string | null = null;

  private ws: WebSocketLike | null = null;
  private readonly newSocket: WebSocketFactory;
  private readonly activityTimeout: number;
  private readonly pongTimeout: number;
  private serverActivityTimeout: number | null = null;

  private attempt = 0;
  private intentional = false;
  // Set when this side has already explained a refusal it is about to trigger,
  // so the close it causes doesn't report the same failure twice.
  private refusalReported = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly url: string,
    options: ConnectionOptions,
  ) {
    super();
    this.activityTimeout = options.activityTimeout ?? DEFAULT_ACTIVITY_TIMEOUT;
    this.pongTimeout = options.pongTimeout ?? DEFAULT_PONG_TIMEOUT;
    const factory =
      options.webSocket ??
      ((u: string) =>
        new (
          globalThis as { WebSocket: new (u: string) => WebSocketLike }
        ).WebSocket(u));
    this.newSocket = factory;
  }

  connect(): void {
    if (this.state === "connected" || this.state === "connecting") return;
    this.intentional = false;
    // A reconnect may already be scheduled (connect() during `unavailable`);
    // cancel it so exactly one open is in flight.
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.open();
  }

  disconnect(): void {
    this.intentional = true;
    this.clearTimers();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close(1000, "client disconnect");
    this.ws = null;
    this.setState("disconnected");
  }

  send(frame: Frame): boolean {
    if (this.state !== "connected" || !this.ws) return false;
    this.ws.send(encode(frame));
    return true;
  }

  private open(): void {
    // Orphan any previous socket: detach its handlers first so its close can't
    // schedule a competing reconnect, then close it.
    if (this.ws) {
      const old = this.ws;
      old.onopen = old.onclose = old.onmessage = old.onerror = null;
      try {
        old.close(1000, "superseded");
      } catch {
        /* already closed */
      }
    }
    this.setState("connecting");
    this.refusalReported = false;
    const ws = this.newSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      // The connection isn't usable until the server's handshake frame arrives;
      // stay in `connecting` until bird:connection_established.
      this.resetActivityTimer();
    };
    ws.onmessage = (ev) => this.onMessage(String(ev.data));
    ws.onerror = () => {
      /* surfaced via the following close */
    };
    ws.onclose = (ev) => this.onClose(ev.code, ev.reason);
  }

  private onMessage(raw: string): void {
    this.resetActivityTimer();
    const frame = decode(raw);
    if (!frame) return;

    switch (frame.event) {
      case Inbound.ConnectionEstablished: {
        const d = (frame.data ?? {}) as {
          connection_id?: string;
          activity_timeout?: number;
        };
        if (!d.connection_id) {
          // No connection id means this is not a Bird Realtime app (e.g. a
          // legacy socket_id handshake). Fail loudly instead of sitting
          // "connected" but unable to subscribe; 4001 is in the no-retry band.
          this.refusalReported = true;
          this.emit("error", {
            code: null,
            message:
              "Handshake missing connection_id — not a Bird Realtime app?",
          });
          this.ws?.close(4001, "handshake missing connection_id");
          return;
        }
        this.connectionId = d.connection_id;
        if (typeof d.activity_timeout === "number") {
          this.serverActivityTimeout = d.activity_timeout * 1000;
        }
        this.attempt = 0;
        this.setState("connected");
        return;
      }
      case Inbound.Ping:
        this.send({ event: Outbound.Pong });
        return;
      case Inbound.Pong:
        if (this.pongTimer) clearTimeout(this.pongTimer);
        this.pongTimer = null;
        return;
      case Inbound.Error: {
        // Channel-LESS server errors (incl. subscribe rejections, which the
        // wire does not attribute to a channel) surface here on the
        // connection. Channel-scoped frames — including
        // bird_internal:subscription_error, routed to
        // Channel.handleSubscriptionError — take the `default` branch below
        // to the client's per-channel router.
        const d = (frame.data ?? {}) as { code?: number; message?: string };
        this.emit("error", d);
        return;
      }
      default:
        // Application events and subscription internals (subscription_
        // succeeded / subscription_error / member events) go to the client,
        // which routes them to the addressed channel's lifecycle handlers.
        this.emit("message", frame);
    }
  }

  private onClose(code: number, reason?: string): void {
    this.clearTimers();
    this.ws = null;
    if (this.intentional) {
      this.setState("disconnected");
      return;
    }
    // Close-code policy (the protocol the Bird server speaks):
    //   4000–4099 refused, do not retry  → failed
    //   4200–4299 retry immediately
    //   everything else (incl. network)  → retry with backoff
    if (code >= 4000 && code <= 4099) {
      // A refused close is terminal, so the code is the only explanation the
      // app ever gets — 4009 (the API terminated this member's connections)
      // and 4004 (app over quota) call for very different UI. A refusal this
      // side already reported (and then closed on) is not repeated.
      if (!this.refusalReported) {
        this.emit("error", { code, message: reason ?? "Connection refused" });
      }
      this.refusalReported = false;
      this.setState("failed");
      return;
    }
    this.setState("unavailable");
    this.scheduleReconnect(code >= 4200 && code <= 4299 ? 0 : this.backoff());
  }

  private scheduleReconnect(delay: number): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.emit("connecting_in", Math.round(delay / 1000));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attempt += 1;
      this.open();
    }, delay);
  }

  private backoff(): number {
    const ceiling = Math.min(BACKOFF_CAP, BACKOFF_BASE * 2 ** this.attempt);
    return Math.random() * ceiling; // full jitter
  }

  private resetActivityTimer(): void {
    this.clearTimers();
    const timeout = this.serverActivityTimeout ?? this.activityTimeout;
    this.activityTimer = setTimeout(() => {
      if (!this.send({ event: Outbound.Ping })) {
        // Still not connected after a full activity window (e.g. a handshake
        // that never completes): the socket is dead, close it directly rather
        // than arming a pong wait for a ping that was never sent.
        this.ws?.close(4200, "activity timeout");
        return;
      }
      this.pongTimer = setTimeout(() => {
        // No pong: the connection is stale. Force a close to trigger reconnect.
        this.ws?.close(4200, "activity timeout");
      }, this.pongTimeout);
    }, timeout);
  }

  private clearTimers(): void {
    if (this.activityTimer) clearTimeout(this.activityTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.activityTimer = null;
    this.pongTimer = null;
  }

  private setState(next: ConnectionState): void {
    if (this.state === next) return;
    const previous = this.state;
    this.state = next;
    // `connecting` keeps the previous connection id (an in-flight authorize
    // may still compare against it); every other non-connected state drops it.
    if (next !== "connected" && next !== "connecting") {
      this.connectionId = null;
    }
    this.emit("state_change", { previous, current: next });
    this.emit(next);
  }
}
