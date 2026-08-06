// HAND-WRITTEN example source for GENERATED contacts methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function contactsCreate() {
  const contact = await bird.contacts.create({
    email: "jane@acme.com",
    first_name: "Jane",
  });
  console.log(contact.id); // "con_…"
}

export async function contactsUpdate() {
  const contact = await bird.contacts.update("con_01krdgeqcxet5s7t44vh8rt9mg", {
    first_name: "Jane",
  });
  console.log(contact.first_name);
}

export async function contactsGet() {
  const contact = await bird.contacts.get("con_01krdgeqcxet5s7t44vh8rt9mg");
  console.log(contact.email, contact.first_name);
}

export async function contactsDelete() {
  await bird.contacts.delete("con_01krdgeqcxet5s7t44vh8rt9mg");
}

export async function contactsBatch() {
  const result = await bird.contacts.batch({
    contacts: [{ email: "jane@acme.com", first_name: "Jane" }],
  });
  for (const item of result.data) {
    console.log(item.entry.email, item.status);
  }
}

export async function contactsList() {
  for await (const contact of bird.contacts.list({ q: "acme.com" })) {
    console.log(contact.id, contact.email);
  }
  const page = await bird.contacts.list({ limit: 50 }); // page.data, page.next_cursor
}
