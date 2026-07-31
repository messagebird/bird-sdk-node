// HAND-WRITTEN example source for GENERATED smsTemplates methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function smsTemplatesList() {
  const { data } = await bird.smsTemplates.list({ scope: "system" });
  for (const tpl of data) console.log(tpl.id, tpl.name);
}

export async function smsTemplatesGet() {
  const tpl = await bird.smsTemplates.get("bird_otp_verification");
  console.log(tpl.body, tpl.variables);
}
