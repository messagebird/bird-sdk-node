// Quickstart: subscribe to a channel and receive events in the browser.
//
// Prerequisites: a Realtime app (dashboard → Realtime → Apps) and its app key.
// Private/presence channels also need an auth endpoint on your backend — sign
// the client's `{ connection_id, channel_name }` with the app secret and
// return `{ auth, member_data? }`.

import { BirdRealtime } from "@messagebird/realtime";
import type { ConnectionState, Member } from "@messagebird/realtime";

const bird = new BirdRealtime({
  appKey: "your-app-key",
  region: "us1", // us1 | eu1 — picks the edge automatically
  authEndpoint: "/bird/auth", // only needed for private-/presence- channels
});

// Public channel: no authorization required.
const orders = bird.subscribe("orders");
orders.bind<{ id: number }>("order-updated", (data) => {
  console.log("order changed", data.id);
});

// Presence channel: authorized by your backend; tracks who is present.
// `subscribe` is typed by the name prefix — no cast needed.
const room = bird.subscribe("presence-room-1");
room.bind("bird:subscription_succeeded", () => {
  console.log("me:", room.myId, "members:", [...room.members.values()]);
});
room.bind<Member>("bird:member_added", (m) =>
  console.log("joined", m.member_id),
);
room.bind<Member>("bird:member_removed", (m) =>
  console.log("left", m.member_id),
);

// Client events on a subscribed private/presence channel.
room.trigger("client-typing", { member_id: "42" });

// Connection lifecycle.
bird.connection.bind<{ previous: ConnectionState; current: ConnectionState }>(
  "state_change",
  ({ previous, current }) => {
    console.log(`connection: ${previous} → ${current}`);
  },
);
