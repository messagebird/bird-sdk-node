// HAND-WRITTEN example source for GENERATED email methods. Compiled + type-checked
// (examples/tsconfig.json includes **/*.ts, aliasing @messagebird/sdk -> ../src).
// Each `bird:snippet` region is the single source of truth for that key: the
// surfacegen TS writer injects it (unmarked) as the @example on the generated
// method, and docsnippet-gen extracts it here for the docs site + README.
// (Override methods — email.send/sendBatch — keep their examples inline in
// src/resources/email.ts, since nothing regenerates over a hand-written method.)

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function emailGet() {
  const msg = await bird.email.get("em_abc123");
  msg.status; // "accepted" | "processed" | "delivered" | "bounced" | …
  msg.delivered_count;
  msg.bounced_count;
}

export async function emailCancel() {
  await bird.email.cancel("em_abc123");
}

export async function emailList() {
  for await (const message of bird.email.list({ status: "bounced" })) {
    console.log(message.id);
  }
  const page = await bird.email.list({ limit: 50 }); // page.data, page.next_cursor
}

export async function emailStatsSummary() {
  const s = await bird.email.stats.summary({ from: "2026-05-01", to: "2026-05-31" });
  console.log(s.sends_accepted, s.delivery.delivered);
}

export async function emailStatsDaily() {
  const series = await bird.email.stats.daily({ from: "2026-05-01", to: "2026-05-31" });
  for (const row of series.data) console.log(row.bucket, row.delivery.delivered);
}

export async function emailStatsHourly() {
  const series = await bird.email.stats.hourly({ from: "2026-05-01", to: "2026-05-02" });
  for (const row of series.data) console.log(row.bucket, row.delivery.delivered);
}

export async function emailStatsByTag() {
  const { data } = await bird.email.stats.byTag({
    from: "2026-05-01",
    to: "2026-05-31",
    sort: "delivered",
    limit: 10,
  });
  for (const row of data) console.log(row.tag, row.delivery.delivered);
}

export async function emailStatsByCategory() {
  const { data } = await bird.email.stats.byCategory({ from: "2026-05-01", to: "2026-05-31" });
  for (const row of data) console.log(row.category, row.delivery.delivered);
}

export async function emailStatsBySendingIp() {
  const { data } = await bird.email.stats.bySendingIp({
    from: "2026-05-01",
    to: "2026-05-31",
    sort: "bounces.block",
    limit: 20,
  });
  for (const row of data) console.log(row.sending_ip, row.delivery.delivered);
}

export async function emailStatsBySendingDomain() {
  const { data } = await bird.email.stats.bySendingDomain({
    from: "2026-05-01",
    to: "2026-05-31",
    sort: "delivery_rate",
    limit: 25,
  });
  for (const row of data) console.log(row.sending_domain, row.delivery.delivery_rate);
}

export async function emailStatsByRecipientDomain() {
  const { data } = await bird.email.stats.byRecipientDomain({
    from: "2026-05-01",
    to: "2026-05-31",
    sort: "bounce_rate",
    limit: 25,
  });
  for (const row of data) console.log(row.recipient_domain, row.delivery.bounce_rate);
}

export async function emailStatsByMailboxProvider() {
  const { data } = await bird.email.stats.byMailboxProvider({
    from: "2026-05-01",
    to: "2026-05-31",
    limit: 25,
  });
  for (const row of data) console.log(row.mailbox_provider, row.delivery.delivered);
}

export async function emailStatsByMailboxProviderRegion() {
  const { data } = await bird.email.stats.byMailboxProviderRegion({
    from: "2026-05-01",
    to: "2026-05-31",
    limit: 25,
  });
  for (const row of data) console.log(row.mailbox_provider, row.mailbox_provider_region, row.delivery.delivered);
}

export async function emailStatsByTemplate() {
  const { data } = await bird.email.stats.byTemplate({
    from: "2026-05-01",
    to: "2026-05-31",
    sort: "open_rate",
    limit: 25,
  });
  for (const row of data) console.log(row.template_id, row.engagement.open_rate);
}

export async function emailStatsByLocation() {
  const { data } = await bird.email.stats.byLocation({
    from: "2026-05-01",
    to: "2026-05-31",
    limit: 25,
  });
  for (const row of data) console.log(row.country, row.engagement.unique_opens);
}

export async function emailStatsByClient() {
  const { data } = await bird.email.stats.byClient({
    from: "2026-05-01",
    to: "2026-05-31",
    limit: 25,
  });
  for (const row of data) console.log(row.email_client, row.engagement.unique_opens);
}

export async function emailStatsByBounceCode() {
  const { data } = await bird.email.stats.byBounceCode({
    from: "2026-05-01",
    to: "2026-05-31",
    sort: "bounced",
    limit: 25,
  });
  for (const row of data) console.log(row.smtp_error_code, row.bounced);
}

export async function emailStatsByComplaintType() {
  const { data } = await bird.email.stats.byComplaintType({ from: "2026-05-01", to: "2026-05-31" });
  for (const row of data) console.log(row.feedback_type, row.complained);
}

export async function emailStatsByBroadcast() {
  const { data } = await bird.email.stats.byBroadcast({
    from: "2026-05-01",
    to: "2026-05-31",
    sort: "click_rate",
    limit: 25,
  });
  for (const row of data) console.log(row.broadcast_id, row.engagement.click_rate);
}
