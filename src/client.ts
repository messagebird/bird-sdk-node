import {
  createClient,
  createConfig,
  type Client,
} from "./generated/client/index.js";
import { baseUrlForRegion, regionFromApiKey } from "./region.js";
import {
  BirdHTTPClient,
  type AttemptContext,
  type FetchOutcome,
} from "./core/http.js";
import {
  apiPromise,
  type APIPromise,
  type RequestOptions,
} from "./core/result.js";
import { EmailResource, type EmailChannelDefaults } from "./resources/email.js";
import { EmailTemplatesResource } from "./resources/emailTemplates.js";
import { SmsResource } from "./resources/sms.js";
import { SmsTemplatesResource } from "./resources/smsTemplates.js";
import { WebhooksResource, type WebhookOptions } from "./resources/webhooks.js";

// The SDK's own version, sent as User-Agent. Injected at build time from
// package.json (tsup/vitest `define`) so it never drifts from the published
// version. Distinct from the Bird API version (X-Bird-API-Version, ADR-0042 §5)
// which is deferred — see sdk-build-ledger #3.
declare const __SDK_VERSION__: string;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;

export interface BirdClientOptions {
  apiKey: string;
  /** Explicit base URL; overrides region resolution. For local/self-hosted use. */
  baseUrl?: string;
  /** Region override (e.g. `"eu1"`); the API key prefix is used by default. */
  region?: string;
  /** Per-attempt timeout in ms. Default 60_000. */
  timeout?: number;
  /** Max retry attempts on retryable failures (429, 5xx, network). Default 2. */
  maxRetries?: number;
  /** Custom fetch — testing, proxying, edge-runtime adapters. Default global fetch. */
  fetch?: typeof fetch;
  /** Headers added to every request. SDK-internal headers win on conflict. */
  defaultHeaders?: Record<string, string>;
  /**
   * Email channel defaults. Any field set here may be omitted in
   * `bird.email.send` (the type enforces this); the per-send value wins.
   */
  email?: EmailChannelDefaults;
  /** Webhooks config — `secret` is the default used by `bird.webhooks.unwrap`. */
  webhooks?: WebhookOptions;
}

/** A raw request for the `bird.request` escape hatch. */
export interface BirdRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * Absolute path on the API host, e.g. `/v1/email/domains`; must start
   * with a single `/`.
   */
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  /** JSON request body. */
  body?: unknown;
  headers?: Record<string, string>;
}

// Extract the email-channel defaults from the (literal) options type, or
// `undefined` when none were set — drives whether `send` requires `from` etc.
type EmailDefaultsOf<O> = O extends {
  email: infer E extends EmailChannelDefaults;
}
  ? E
  : undefined;

// Precedence: explicit baseUrl, then explicit region, then the key's region
// prefix. There is no region-less data-plane host, so an unresolvable region throws.
function resolveBaseUrl(options: BirdClientOptions): string {
  if (options.baseUrl) return options.baseUrl;
  const region = options.region ?? regionFromApiKey(options.apiKey);
  if (!region) {
    throw new Error(
      "Unable to determine region: API key is not in the expected " +
        "bk_{region}_{token} format. Pass an explicit `region` or `baseUrl`.",
    );
  }
  return baseUrlForRegion(region);
}

// The raw escape hatch accepts caller-supplied paths. Require an absolute path
// segment (not an authority-relative URL) and assert the final origin before
// attaching SDK auth headers.
function resolveRawRequestUrl(baseUrl: string, path: string): URL {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new TypeError(
      "bird.request path must be an absolute path starting with a single `/`",
    );
  }
  const base = new URL(baseUrl);
  const url = new URL(baseUrl + path);
  if (url.origin !== base.origin) {
    throw new TypeError(
      "bird.request path must stay on the configured Bird API origin",
    );
  }
  return url;
}

/**
 * The Bird API client. Construct it with an API key; the region is taken from
 * the key's prefix (`bk_{region}_…`) — pass `baseUrl` or `region` to override.
 *
 * @example Construct and send
 * const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });
 * const msg = await bird.email.send({
 *   from: "hello@acme.com",
 *   to: ["customer@example.com"],
 *   subject: "Welcome aboard",
 *   html: "<h1>Hi there 👋</h1>",
 * });
 * console.log(msg.id);
 *
 * @example Channel defaults — set common send fields once; a per-send value always wins
 * const bird = new BirdClient({
 *   apiKey: process.env.BIRD_API_KEY!,
 *   email: { from: "hello@acme.com", category: "transactional" },
 * });
 * // `from` and `category` are filled from the defaults; both stay optional in `send`.
 * await bird.email.send({ to: ["customer@example.com"], subject: "Hi", html: "<p>hi</p>" });
 *
 * @example All client options
 * const bird = new BirdClient({
 *   apiKey: process.env.BIRD_API_KEY!,
 *   region: "eu1", // optional — override the region from the key prefix
 *   baseUrl: "http://localhost:8080", // optional — overrides region entirely (local/self-hosted)
 *   timeout: 60_000, // per-attempt timeout in ms (default 60_000)
 *   maxRetries: 2, // retry budget for transient failures (default 2)
 * });
 */
export class BirdClient<const O extends BirdClientOptions = BirdClientOptions> {
  protected readonly core: BirdHTTPClient;

  // The generated hey-api client, configured with this instance's base URL,
  // auth, and fetch. Resources call the generated SDK functions through it.
  readonly #client: Client;
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;
  readonly #headers: Record<string, string>;

  /** The email channel — `bird.email.send(...)`, `.get(...)`, `.list(...)`. */
  readonly email: EmailResource<EmailDefaultsOf<O>>;

  /** Email templates — `bird.emailTemplates.create(...)`, `.list(...)`, `.publish(...)`, … */
  readonly emailTemplates: EmailTemplatesResource;

  /** The SMS channel — `bird.sms.send(...)`, `.get(...)`, `.list(...)`. */
  readonly sms: SmsResource;

  /** SMS templates — `bird.smsTemplates.list(...)`, `.get(...)`. */
  readonly smsTemplates: SmsTemplatesResource;

  /** Webhooks — `bird.webhooks.unwrap(payload, headers)` verifies an inbound delivery. */
  readonly webhooks: WebhooksResource;

  constructor(options: O) {
    const opts: BirdClientOptions = options; // widen for safe optional access
    this.#baseUrl = resolveBaseUrl(opts);
    this.#fetch = opts.fetch ?? fetch;
    this.#headers = {
      ...opts.defaultHeaders,
      Authorization: `Bearer ${opts.apiKey}`,
      "User-Agent": `bird-sdk-js/${__SDK_VERSION__}`,
      // Bird-* client-identity headers (ADR-0074): the API attributes the SDK
      // surface from these, not the User-Agent. Edge-safe, so no os/arch/runtime
      // (those need Node globals this SDK must not touch); surface + version only.
      "Bird-Surface": "sdk-js",
      "Bird-Version": __SDK_VERSION__,
    };
    this.#client = createClient(
      createConfig({
        baseUrl: this.#baseUrl,
        fetch: this.#fetch,
        headers: this.#headers,
      }),
    );
    this.core = new BirdHTTPClient({
      timeout: opts.timeout ?? DEFAULT_TIMEOUT_MS,
      maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
    });
    // The runtime value is the configured defaults (or undefined); the precise
    // conditional type can't be reproved from the widened access, so assert it.
    this.email = new EmailResource<EmailDefaultsOf<O>>(
      this.core,
      this.#client,
      opts.email as EmailDefaultsOf<O>,
    );
    this.emailTemplates = new EmailTemplatesResource(this.core, this.#client);
    this.sms = new SmsResource(this.core, this.#client);
    this.smsTemplates = new SmsTemplatesResource(this.core, this.#client);
    this.webhooks = new WebhooksResource(opts.webhooks);
  }

  /**
   * Escape hatch for endpoints the typed resources don't cover. Runs the full
   * lifecycle (auth, retries, idempotency, error mapping); you supply the
   * response type. Prefer a typed resource method where one exists.
   *
   * @throws {TypeError} if `req.path` does not start with exactly one `/` or
   *   resolves to a different origin than the configured Bird API base URL.
   *
   * @example Reach an endpoint outside the curated surface — you supply the response type
   * type Suppressions = { data: Array<{ recipient: string }> };
   * const suppressions = await bird.request<Suppressions>({ method: "GET", path: "/v1/email/suppressions" });
   * console.log(suppressions.data.length);
   */
  request<T = unknown>(
    req: BirdRequest,
    options?: RequestOptions,
  ): APIPromise<T> {
    const url = resolveRawRequestUrl(this.#baseUrl, req.path);
    return apiPromise(
      this.core.request<T>(
        (ctx) => this.#raw<T>(url, req, ctx, options?.headers),
        {
          method: req.method,
          idempotencyKey: options?.idempotencyKey,
          signal: options?.signal,
          timeout: options?.timeout,
          maxRetries: options?.maxRetries,
        },
      ),
    );
  }

  async #raw<T>(
    url: URL,
    req: BirdRequest,
    ctx: AttemptContext,
    extraHeaders?: Record<string, string>,
  ): Promise<FetchOutcome<T>> {
    url = new URL(url);
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    // SDK-internal headers (auth, idempotency) win over caller-supplied ones.
    const headers: Record<string, string> = {
      ...extraHeaders,
      ...this.#headers,
    };
    if (ctx.idempotencyKey) headers["Idempotency-Key"] = ctx.idempotencyKey;
    if (req.body !== undefined) headers["Content-Type"] = "application/json";

    const response = await this.#fetch(url, {
      method: req.method,
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      signal: ctx.signal,
    });

    if (response.ok) {
      const data =
        response.status === 204
          ? undefined
          : await response.json().catch(() => undefined);
      // Caller supplies T; the raw JSON is asserted to it (escape hatch — untyped path).
      return { data: data as T, response };
    }
    const error = await response
      .clone()
      .json()
      .catch(() => undefined);
    return { error, response };
  }
}
