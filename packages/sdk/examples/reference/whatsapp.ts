// HAND-WRITTEN example source for GENERATED whatsapp methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README. `send` stays hand-written, so its example stays inline in
// src/resources/whatsapp.ts.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function whatsappGet() {
  const msg = await bird.whatsapp.get("wa_abc123");
  msg.status; // "accepted" | "delivered" | …
}

export async function whatsappList() {
  for await (const msg of bird.whatsapp.list({ status: ["delivered"] })) {
    console.log(msg.id, msg.status);
  }
}

export async function whatsappListEvents() {
  const { data } = await bird.whatsapp.listEvents("wa_abc123");
  for (const event of data) console.log(event.type, event.occurred_at);
}
