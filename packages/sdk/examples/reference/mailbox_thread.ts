// HAND-WRITTEN example source for GENERATED mailboxThread methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function mailboxThreadList() {
  for await (const thread of bird.mailboxThread.list({ mailbox_id: "mbx_01abc" })) {
    console.log(thread.id, thread.subject);
  }
}

export async function mailboxThreadGet() {
  const thread = await bird.mailboxThread.get("thr_01abc");
  console.log(thread.subject);
}

export async function mailboxThreadUpdate() {
  const thread = await bird.mailboxThread.update("thr_01abc", {
    labels: { add: ["archive"] },
  });
  console.log(thread.id);
}

export async function mailboxThreadDelete() {
  await bird.mailboxThread.delete("thr_01abc", { permanent: true });
}
