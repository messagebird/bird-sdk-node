// The request lifecycle: retries, timeouts, and idempotency.
//
// BirdHTTPClient owns the attempt loop and wraps a generated hey-api SDK call
// (passed as a thunk) so resources keep the generated call-site typing while
// the loop owns: idempotency-key generate-once-and-reuse, per-attempt timeout,
// AbortSignal, backoff with full jitter + Retry-After, and turning a terminal
// response into a thrown BirdError via mapResponseToError.
//
// The hey-api client is configured WITHOUT throwOnError: a non-2xx returns
// `{ error, response }` so this loop can inspect status and decide
// retry-vs-throw. Network failures reject and are caught here.

import {
  BirdConnectionError,
  BirdError,
  BirdTimeoutError,
  mapResponseToError,
  parseRetryAfter,
} from "../errors.js";

/** Transport metadata exposed to callers via `.withResponse()`. */
export interface BirdResponse {
  status: number;
  headers: Headers;
  /** Correlation ID — the `X-Request-Id` header. */
  requestId: string;
}

/** Per-request lifecycle inputs, supplied by the resource method. */
export interface RequestLifecycleOptions {
  /** HTTP method — decides idempotency-key generation and retry safety. */
  method: string;
  /** Caller-supplied idempotency key; auto-generated for mutations if absent. */
  idempotencyKey?: string;
  /** Caller cancellation. */
  signal?: AbortSignal;
  /** Per-attempt timeout (ms). Overrides the client default. */
  timeout?: number;
  /** Max retry attempts. Overrides the client default. */
  maxRetries?: number;
}

/** The shape a generated hey-api SDK call resolves to. */
export interface FetchOutcome<T> {
  data?: T;
  error?: unknown;
  /** Present whenever the HTTP round-trip completed; absent only on a rejected call. */
  response?: Response;
}

/** Context handed to the call thunk on each attempt. */
export interface AttemptContext {
  signal: AbortSignal;
  idempotencyKey?: string;
}

export interface CoreDefaults {
  /** Per-attempt timeout (ms). */
  timeout: number;
  /** Max retry attempts. */
  maxRetries: number;
  /**
   * Extra credentials some operations require on top of the API key, keyed by the
   * security scheme that names them. A generated method names the schemes its
   * operation declares; the core resolves them, so a credential reaches only
   * those operations and never an unrelated request.
   */
  credentials?: Record<string, { header: string; value?: string; how: string }>;
}

const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 8_000;
const RETRY_AFTER_CAP_MS = 60_000;

export class BirdHTTPClient {
  constructor(private readonly defaults: CoreDefaults) {}

  /**
   * Resolve the credential headers an operation's security schemes require.
   * Throws before the request when one is unconfigured, so a caller gets a named
   * error instead of a 401.
   */
  credentialHeaders(
    schemes: string[] | undefined,
    override?: Record<string, string>,
  ): Record<string, string> {
    if (!schemes?.length) return {};
    const out: Record<string, string> = {};
    for (const scheme of schemes) {
      const cred = this.defaults.credentials?.[scheme];
      if (!cred) throw new Error(`Unknown credential scheme "${scheme}"`);
      const value = override?.[scheme] ?? cred.value;
      if (!value) throw new Error(`${cred.header} is required for this operation. ${cred.how}`);
      out[cred.header] = value;
    }
    return out;
  }

  /**
   * Run a generated hey-api SDK call through the request lifecycle.
   *
   * @param call  Invokes the SDK function; receives the per-attempt signal and
   *              the idempotency key to set as a header.
   * @returns the parsed body plus transport metadata.
   * @throws  a `BirdError` subclass on terminal failure; the native
   *          `AbortError` if the caller's signal aborts.
   */
  async request<T>(
    call: (ctx: AttemptContext) => Promise<FetchOutcome<T>>,
    options: RequestLifecycleOptions,
  ): Promise<{ data: T; response: BirdResponse }> {
    const maxRetries = options.maxRetries ?? this.defaults.maxRetries;
    const timeout = options.timeout ?? this.defaults.timeout;
    // Generated once, reused on every attempt — regenerating would double-execute.
    const idempotencyKey =
      options.idempotencyKey ??
      (isMutation(options.method) ? crypto.randomUUID() : undefined);

    for (let attempt = 0; ; attempt++) {
      throwIfAborted(options.signal);

      // Retry a transient failure with backoff if attempts remain; otherwise
      // throw the terminal error. Caller `continue`s the loop after this returns.
      const retryOrThrow = async (terminal: () => BirdError): Promise<void> => {
        if (attempt >= maxRetries) throw terminal();
        await sleep(backoffDelay(attempt), options.signal);
      };

      const timeoutSignal = AbortSignal.timeout(timeout);
      const signal = options.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

      let outcome: FetchOutcome<T> | undefined;
      try {
        outcome = await call({ signal, idempotencyKey });
      } catch (err) {
        // The fetch rejected: caller abort, per-attempt timeout, or network.
        throwIfAborted(options.signal); // caller abort wins, terminal
        await retryOrThrow(() =>
          timeoutSignal.aborted
            ? new BirdTimeoutError(`Request timed out after ${timeout}ms`, timeout)
            : new BirdConnectionError(errorMessage(err)),
        );
        continue;
      }

      const res = outcome.response;
      if (!res) {
        // A resolved call with no response is a transport failure (the client
        // normally rejects instead) — treat it like a network error.
        await retryOrThrow(() => new BirdConnectionError("No response received from the server"));
        continue;
      }
      if (res.ok) {
        return { data: outcome.data as T, response: toBirdResponse(res) };
      }
      if (!isRetryableStatus(res.status) || attempt >= maxRetries) {
        throw mapResponseToError(res.status, outcome.error, res.headers);
      }
      await sleep(retryDelay(attempt, res.headers), options.signal);
    }
  }
}

function isMutation(method: string): boolean {
  return ["POST", "PATCH", "DELETE"].includes(method.toUpperCase());
}

// Retry network failures, per-attempt timeouts, and transient statuses. 409 is a
// semantic conflict a retry can't resolve; 501 is permanent; other 4xx are
// deterministic.
function isRetryableStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

/** Full-jitter exponential backoff: random in [0, min(cap, base·2^attempt)). */
function backoffDelay(attempt: number): number {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
  return Math.random() * ceiling;
}

/** Honor Retry-After on a retryable response, else fall back to backoff. */
function retryDelay(attempt: number, headers: Headers): number {
  const seconds = parseRetryAfter(headers);
  return seconds === undefined ? backoffDelay(attempt) : Math.min(seconds * 1000, RETRY_AFTER_CAP_MS);
}

function toBirdResponse(res: Response): BirdResponse {
  return {
    status: res.status,
    headers: res.headers,
    requestId: res.headers.get("X-Request-Id") ?? "",
  };
}

// The abort contract: surface the caller's `signal.reason` so a caller-initiated
// abort stays the native AbortError, falling back to a synthetic one.
function abortReason(signal: AbortSignal | undefined): unknown {
  return signal?.reason ?? new DOMException("Aborted", "AbortError");
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw abortReason(signal);
}

/** Sleep, rejecting immediately if the caller's signal aborts. */
function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
