# @messagebird/realtime

The Bird Realtime browser client. Subscribe to channels and receive events in real time over a WebSocket.

> Looking for the server-side SDK (send messages, manage resources, verify webhooks — including publishing Realtime events)? That's [`@messagebird/sdk`](https://www.npmjs.com/package/@messagebird/sdk).

> Draft — the API is settling. Web (browser) only for now.

## Install

```sh
npm install @messagebird/realtime
```

## Quickstart

Browsable example: [`examples/quickstart-realtime.ts`](./examples/quickstart-realtime.ts)

```ts
import { BirdRealtime } from "@messagebird/realtime";

const bird = new BirdRealtime({
  appKey: "your-app-key",
  region: "us1", // us1 | eu1 — picks the edge automatically
});

const channel = bird.subscribe("orders");
channel.bind<{ id: number }>("order-updated", (data) => {
  console.log("order changed", data.id);
});

// Connection lifecycle
bird.connection.bind<{ previous: string; current: string }>("state_change", ({ previous, current }) => {
  console.log(`connection: ${previous} → ${current}`);
});
```

### Private and presence channels

Private (`private-…`) and presence (`presence-…`) channels are authorized by your backend. The client POSTs `{ connection_id, channel_name }` to your auth endpoint (same-origin by default — see `allowCrossOriginAuth`); your server signs it with the app secret and returns `{ auth, member_data? }`.

```ts
import type { Member } from "@messagebird/realtime";

const bird = new BirdRealtime({
  appKey: "your-app-key",
  region: "us1",
  authEndpoint: "/bird/auth", // your backend
});

// `subscribe` is typed by the name prefix, so presence members need no cast.
const room = bird.subscribe("presence-room-1");
room.bind("bird:subscription_succeeded", () => {
  console.log("me:", room.myId, "members:", [...room.members.values()]);
});
room.bind<Member>("bird:member_added", (member) => console.log("joined", member.member_id));
```

Server subscription rejections (bad signature, capacity) arrive on the connection, not the channel — the wire carries no channel attribution — so bind `bird.connection.bind("error", …)` to observe them; an authorizer failure does emit `bird:subscription_error` on the channel.

### Signing in a member

`signin()` tells the edge who this connection belongs to, which is what lets the events API address a member and the disconnect API terminate them. The client POSTs `{ connection_id }` to `memberAuthEndpoint`; your server returns `{ auth, member_data }`, where `member_data` is the JSON string it signed.

```ts
const bird = new BirdRealtime({
  appKey: "your-app-key",
  region: "us1",
  memberAuthEndpoint: "/bird/auth/member", // your backend
});

const member = await bird.signin();
console.log("signed in as", member.member_id);

// The API terminated this member's connections.
bird.connection.bind("error", (e) => {
  if (e.code === 4009) console.log("session ended elsewhere");
});

// A re-signin after a reconnect failed: still connected, but no identity.
bird.connection.bind("signin_error", (e) => console.warn(e.message));
```

The identity lives on the connection, so it is dropped when the connection drops and re-established on the next one. Call `signin()` once. The re-signin has no promise to reject, which is what `signin_error` is for; it is a separate event from `error` so a failing member endpoint cannot disturb channel subscriptions.

### Client events

On a subscribed private/presence channel you can trigger `client-` events:

```ts
room.trigger("client-typing", { member_id: "42" });
```

### Errors

Everything the SDK throws extends `BirdRealtimeError`; the default authorizer's failures are `RealtimeAuthError` with `endpoint` and `status`.

## Design

- **Modern & tiny.** TypeScript-first, ESM, native `WebSocket` + `fetch`, no runtime dependencies, tree-shakeable.
- **Automatic reconnect** with exponential backoff + jitter, and channels are re-subscribed transparently (with fresh auth) on reconnect.
- **TLS always** for non-loopback hosts; `allowInsecure` is honored only for `localhost` development.

## Channels & events

| Name prefix | Type     | Authorized |
| ----------- | -------- | ---------- |
| _(none)_    | public   | no         |
| `private-`  | private  | yes        |
| `presence-` | presence | yes        |

`signin()` adds a fourth authorized surface: it signs `<connection_id>::member::<member_data>` rather than a channel name, so a presence auth response can never be replayed as a signin.

Lifecycle events you can bind to: `bird:subscription_succeeded`, `bird:subscription_error` (authorizer failures), `bird:connection_count`, and (presence) `bird:member_added` / `bird:member_removed`.

## License

MIT
