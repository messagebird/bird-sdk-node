// HAND-WRITTEN example source for GENERATED domains methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function domainsCreate() {
  const domain = await bird.domains.create({ domain: "mail.acme.com" });
  console.log(domain.id, domain.status); // "dom_…", "pending"
}

export async function domainsGet() {
  const domain = await bird.domains.get("dom_01krdgeqcxet5s7t44vh8rt9mg");
  console.log(domain.domain);
}

export async function domainsList() {
  for await (const domain of bird.domains.list()) {
    console.log(domain.id, domain.status);
  }
}

export async function domainsUpdate() {
  await bird.domains.update("dom_01krdgeqcxet5s7t44vh8rt9mg", {
    settings: { click_tracking: true, open_tracking: true },
    tracking: { name: "links" },
  });
}

export async function domainsVerify() {
  const domain = await bird.domains.verify("dom_01krdgeqcxet5s7t44vh8rt9mg");
  console.log(domain.status); // "verified" once DNS is in place
}

export async function domainsDelete() {
  await bird.domains.delete("dom_01krdgeqcxet5s7t44vh8rt9mg");
}
