// HAND-WRITTEN example source for GENERATED realtime methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({
  apiKey: process.env.BIRD_API_KEY!,
  realtime: { key: process.env.BIRD_REALTIME_KEY!, secret: process.env.BIRD_REALTIME_SECRET! },
});

export async function realtimePublish() {
  const result = await bird.realtime.publish("rap_01krdgeqcxet5s7t44vh8rt9mg", {
    event: "order.updated",
    channels: ["orders", "presence-lobby"],
    data: { order_id: "ord_123", status: "shipped" },
  });
  console.log(result.data?.length); // one entry per channel
}

export async function realtimePublishBatch() {
  await bird.realtime.publishBatch("rap_01krdgeqcxet5s7t44vh8rt9mg", {
    events: [
      { event: "order.created", channel: "orders", data: { id: 1 } },
      { event: "order.updated", channel: "orders", data: { id: 2 } },
    ],
  });
}

export async function realtimeChannelsList() {
  const { data } = await bird.realtime.channels.list("rap_01krdgeqcxet5s7t44vh8rt9mg", {
    prefix: "presence-",
    include: ["member_count"],
  });
  for (const channel of data) console.log(channel.name, channel.member_count);
}

export async function realtimeChannelsGet() {
  const channel = await bird.realtime.channels.get("rap_01krdgeqcxet5s7t44vh8rt9mg", "presence-lobby", {
    include: ["member_count"],
  });
  console.log(channel.occupied, channel.member_count);
}

export async function realtimeChannelsMembers() {
  const { members } = await bird.realtime.channels.members("rap_01krdgeqcxet5s7t44vh8rt9mg", "presence-lobby");
  for (const member of members) console.log(member.member_id);
}

export async function realtimeMembersSend() {
  await bird.realtime.members.send("rap_01krdgeqcxet5s7t44vh8rt9mg", "user_42", {
    event: "order-shipped",
    data: { order_id: "ord_123" },
  });
}

export async function realtimeMembersDisconnect() {
  await bird.realtime.members.disconnect("rap_01krdgeqcxet5s7t44vh8rt9mg", "user_42");
}
