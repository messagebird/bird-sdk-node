// HAND-WRITTEN example source for GENERATED mailboxReceiveRule methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function mailboxReceiveRuleCreate() {
  const rule = await bird.mailboxReceiveRule.create("mbx_01abc", {
    action: "block",
    entry: "spam.example.com",
  });
  console.log(rule.id);
}

export async function mailboxReceiveRuleDelete() {
  await bird.mailboxReceiveRule.delete("mbx_01abc", "erl_01xyz");
}

export async function mailboxReceiveRuleList() {
  for await (const rule of bird.mailboxReceiveRule.list("mbx_01abc")) {
    console.log(rule.action, rule.entry);
  }
}
