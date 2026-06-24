# @messagebird/sdk

The official TypeScript SDK for the [Bird](https://bird.com) API — fully typed, edge-ready, ESM.

📚 **Documentation:** https://bird.com/docs/sdks/typescript

## Requirements

- **Node.js 20.3+** or a modern edge runtime (Cloudflare Workers, Vercel Edge, Deno). The SDK uses only web-standard APIs (`fetch`, `AbortSignal`, Web Crypto) and ships no Node built-ins.
- **ESM package.** `import` works everywhere. `require("@messagebird/sdk")` also works on Node 20.19+ (via `require(esm)`); on older runtimes, load it with `await import("@messagebird/sdk")`.

## Install

```sh
pnpm add @messagebird/sdk
```

> This SDK is generated from Bird's public OpenAPI bundle inside Bird's internal monorepo, which is the single source of truth; this repository tracks tagged releases. Generation runs in the monorepo, so `pnpm generate` won't work from a clone here — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Quickstart

<!-- bird:snippet quickstart-email -->

```ts
import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

const msg = await bird.email.send({
  from: { email: "onboarding@messagebird.dev", name: "Bird" },
  to: ["delivered@messagebird.dev"],
  subject: "Hello from Bird",
  html: "<p>My first Bird email.</p>",
});

console.log(msg.id, msg.status);
```

The region is inferred from the API key prefix (`bk_{region}_…`). For a local or self-hosted server, pass `baseUrl` (which overrides region resolution).

## Client defaults

Set channel defaults and the webhook secret once at construction. Defaulted fields become optional on each call (the per-call value wins), enforced by the types.

```ts
const bird = new BirdClient({
  apiKey: process.env.BIRD_API_KEY!,
  email: { from: "hello@acme.com" }, // now optional in email.send
  webhooks: { secret: process.env.BIRD_WEBHOOK_SECRET! },
});

await bird.email.send({ to: ["customer@example.com"], subject: "Hi", html: "…" });
```

## Email

```ts
await bird.email.send({ from, to, subject, html }); // resolves when accepted (202)
await bird.email.get(messageId); // aggregate delivery status

// `await` yields the first page; `for await` walks every message across pages.
for await (const message of bird.email.list()) {
  console.log(message.id);
}
```

## Webhooks

`unwrap` verifies a delivery's Standard Webhooks signature and returns a typed, discriminated event. **Pass the raw request body** — never the parsed JSON. Set the signing secret once via `webhooks: { secret }` on the client (or pass `{ secret }` per call).

```ts
const event = bird.webhooks.unwrap(rawBody, request.headers);
switch (event.type) {
  case "email.delivered":
    console.log(event.email_id, event.recipient); // narrowed; fields are flat
    break;
  default: // unknown future events land here — forward-compatible
}
```

> Endpoint management (registering/listing webhook endpoints) is not in this release; it returns once the delivery substrate stabilises.

## Errors

Methods **throw** on failure with a typed error hierarchy you narrow with `instanceof`:

<!-- bird:snippet email.errors -->

```ts
import { BirdRateLimitError, BirdValidationError, BirdAPIError } from "@messagebird/sdk";

try {
  await bird.email.send({
    from: { email: "onboarding@messagebird.dev", name: "Bird" },
    to: ["delivered@messagebird.dev"],
    subject: "Hello from Bird",
    html: "<p>My first Bird email.</p>",
  });
} catch (err) {
  if (err instanceof BirdRateLimitError) console.log(`rate limited — retry in ${err.retryAfter}s`);
  else if (err instanceof BirdValidationError) console.error(err.details);
  else if (err instanceof BirdAPIError) console.error(err.code, err.requestId);
  else throw err;
}
```

Every API error carries `statusCode`, `requestId`, and `type`. The core retries safely on `429`/`5xx`/network failures (mutations reuse one idempotency key across attempts).

Prefer to branch on a value instead of catching? Use `.safe()`:

<!-- bird:snippet email.safe -->

```ts
const { data, error } = await bird.email
  .send({
    from: { email: "onboarding@messagebird.dev", name: "Bird" },
    to: ["delivered@messagebird.dev"],
    subject: "Hello from Bird",
    html: "<p>My first Bird email.</p>",
  })
  .safe();
if (error) console.error(error.message);
else console.log(data.id);
```

And `.withResponse()` exposes transport metadata (status, headers, request id) on success:

```ts
const { data, response } = await bird.email.list().withResponse();
response.headers.get("ratelimit-remaining");
```

## Escape hatch

For endpoints the typed resources don't cover yet, `request<T>()` runs the full lifecycle (auth, retries, idempotency, error mapping) — you supply the response type:

```ts
const domains = await bird.request<DomainList>({ method: "GET", path: "/v1/email/domains" });
```

## Configuration

```ts
new BirdClient({
  apiKey: "bk_eu1_…",
  region: "eu1", // override the key-prefix region
  baseUrl: "http://localhost:8080", // override entirely (local/self-hosted)
  timeout: 60_000, // per-attempt timeout (ms)
  maxRetries: 2,
  fetch: customFetch, // proxying, edge adapters, testing
  defaultHeaders: { "X-My-Header": "…" },
});
```
