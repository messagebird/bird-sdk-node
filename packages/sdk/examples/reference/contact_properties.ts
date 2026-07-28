// HAND-WRITTEN example source for GENERATED contactProperties methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README. (Override methods — contactProperties.create/update — keep
// their examples inline in src/resources/contactProperties.ts, since nothing
// regenerates over a hand-written method.)

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function contactPropertiesGet() {
  const prop = await bird.contactProperties.get("cp_01krdgeqcxet5s7t44vh8rt9mg");
  console.log(prop.key, prop.type);
}

export async function contactPropertiesList() {
  for await (const prop of bird.contactProperties.list()) {
    console.log(prop.key, prop.type);
  }
  const page = await bird.contactProperties.list({ limit: 50 }); // page.data, page.next_cursor
}

export async function contactPropertiesArchive() {
  const prop = await bird.contactProperties.archive("cp_01krdgeqcxet5s7t44vh8rt9mg");
  console.log(prop.key, prop.archived);
}

export async function contactPropertiesUnarchive() {
  await bird.contactProperties.unarchive("cp_01krdgeqcxet5s7t44vh8rt9mg");
}
