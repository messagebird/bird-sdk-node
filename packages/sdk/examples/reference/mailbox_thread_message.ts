// HAND-WRITTEN example source for GENERATED mailboxThreadMessage methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function mailboxThreadMessageReply() {
  const reply = await bird.mailboxThreadMessage.reply("thr_01abc", "rem_01xyz", {
    text: "Thanks for reaching out!",
  });
  console.log(reply.id);
}

export async function mailboxThreadMessageGet() {
  const msg = await bird.mailboxThreadMessage.get("thr_01abc", "rem_01xyz");
  console.log(msg.direction); // "inbound"
}

export async function mailboxThreadMessageBody() {
  const body = await bird.mailboxThreadMessage.body("thr_01abc", "rem_01xyz");
  console.log(body.text);
}

export async function mailboxThreadMessageAttachments() {
  const atts = await bird.mailboxThreadMessage.attachments("thr_01abc", "rem_01xyz");
  console.log(atts.data.map((a) => a.filename));
}

export async function mailboxThreadMessageList() {
  for await (const msg of bird.mailboxThreadMessage.list("thr_01abc")) {
    console.log(msg.id, msg.direction);
  }
}
