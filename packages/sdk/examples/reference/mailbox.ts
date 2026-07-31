// HAND-WRITTEN example source for GENERATED mailbox methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README. (The one override method — mailbox.compose — keeps its
// example inline in src/resources/mailbox.ts, since nothing regenerates over a
// hand-written method.)

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function mailboxList() {
  for await (const mailbox of bird.mailbox.list()) {
    console.log(mailbox.address);
  }
}

export async function mailboxCreate() {
  const mailbox = await bird.mailbox.create({ display_name: "Support" });
  console.log(mailbox.address); // "abc123@inbox.ai"
}

export async function mailboxGet() {
  const mailbox = await bird.mailbox.get("mbx_01abc");
  console.log(mailbox.state); // "active"
}

export async function mailboxDelete() {
  await bird.mailbox.delete("mbx_01abc");
}

export async function mailboxRestore() {
  const mailbox = await bird.mailbox.restore("mbx_01abc");
  console.log(mailbox.deleted_at); // null
}

export async function mailboxResume() {
  const mailbox = await bird.mailbox.resume("mbx_01abc");
  console.log(mailbox.state); // "active"
}

export async function mailboxStats() {
  const stats = await bird.mailbox.stats("mbx_01abc");
  console.log(stats.summary?.sends_accepted);
}

export async function mailboxLabels() {
  const labels = await bird.mailbox.labels("mbx_01abc");
  console.log(labels.data.map((label) => label.name));
}

export async function mailboxUpdate() {
  const mailbox = await bird.mailbox.update("mbx_01abc", {
    receive_policy: "open",
  });
  console.log(mailbox.id, mailbox.receive_policy);
}
