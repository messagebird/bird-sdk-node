// HAND-WRITTEN example source for GENERATED sms methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README. The sends stay hand-written, so their examples stay inline
// in src/resources/sms.ts.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function smsGet() {
  const msg = await bird.sms.get("sms_abc123");
  msg.status; // "accepted" | "delivered" | …
}

export async function smsList() {
  for await (const msg of bird.sms.list({ direction: "outbound" })) {
    console.log(msg.id, msg.status);
  }
}
