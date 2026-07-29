// HAND-WRITTEN example source for GENERATED audiences methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function audiencesCreate() {
  const audience = await bird.audiences.create({ name: "Newsletter subscribers" });
  console.log(audience.id); // "adn_…"
}

export async function audiencesGet() {
  const audience = await bird.audiences.get("adn_01krdgeqcxet5s7t44vh8rt9mg");
  console.log(audience.name);
}

export async function audiencesUpdate() {
  await bird.audiences.update("adn_01krdgeqcxet5s7t44vh8rt9mg", { name: "Renamed" });
}

export async function audiencesDelete() {
  await bird.audiences.delete("adn_01krdgeqcxet5s7t44vh8rt9mg");
}

export async function audiencesList() {
  for await (const audience of bird.audiences.list()) {
    console.log(audience.id, audience.name);
  }
}

export async function audiencesListContacts() {
  for await (const member of bird.audiences.listContacts("adn_01krdgeqcxet5s7t44vh8rt9mg")) {
    console.log(member.contact.id, member.joined_at);
  }
}

export async function audiencesAddContacts() {
  await bird.audiences.addContacts("adn_01krdgeqcxet5s7t44vh8rt9mg", {
    contact_ids: ["con_01krdgeqcxet5s7t44vh8rt9mg"],
  });
}

export async function audiencesRemoveContacts() {
  await bird.audiences.removeContacts("adn_01krdgeqcxet5s7t44vh8rt9mg", {
    contact_ids: ["con_01krdgeqcxet5s7t44vh8rt9mg"],
  });
}

export async function audiencesRemoveContact() {
  await bird.audiences.removeContact(
    "adn_01krdgeqcxet5s7t44vh8rt9mg",
    "con_01krdgeqcxet5s7t44vh8rt9mg",
  );
}
