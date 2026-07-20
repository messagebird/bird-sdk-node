// What resource methods return: a Promise you can await for the value, plus
// `.withResponse()` for transport metadata and `.safe()` for a non-throwing
// `{ data, error, response }` result (ADR-0042 §1 — errors throw by default,
// `.safe()` is the opt-in result form). Pagination follows R1: awaiting a list yields the
// first page; `for await` walks every item across pages, fetching lazily.

import type { BirdResponse } from "./http.js";
import { BirdError } from "../errors.js";

/** Per-request overrides accepted by every resource method. */
export interface RequestOptions {
  /** Idempotency key; auto-generated for mutations if omitted, reused on retry. */
  idempotencyKey?: string;
  /** Caller cancellation. Rejects with the native `AbortError`. */
  signal?: AbortSignal;
  /** Per-attempt timeout (ms). Overrides the client default. */
  timeout?: number;
  /** Max retry attempts. Overrides the client default. */
  maxRetries?: number;
  /** Extra headers for this request. SDK-internal headers win on conflict. */
  headers?: Record<string, string>;
}

/**
 * The result of `.safe()` — the value or the error, never thrown. On success
 * `data` and the `response` envelope are present and `error` is `null`. On
 * failure `error` is a `BirdError` you can `instanceof`-narrow, and `data`/
 * `response` are `null` — the metadata you need (status, request id) is on the
 * error itself. A caller-initiated abort is not a Bird failure and still throws
 * (the native `AbortError`, ADR-0042 §1).
 */
export type SafeResult<T> =
  | { data: T; error: null; response: BirdResponse }
  | { data: null; error: BirdError; response: null };

/** Single-result return: `await` for the value, `.withResponse()` for metadata. */
export interface APIPromise<T> extends Promise<T> {
  withResponse(): Promise<{ data: T; response: BirdResponse }>;
  /** Resolve to `{ data, error }` instead of throwing. */
  safe(): Promise<SafeResult<T>>;
}

// Build the base `await`→data promise shared by both wrappers and wire its
// `.withResponse()`/`.safe()` views onto `inner`.
//
// `.withResponse()` and `.safe()` consume `inner` directly, so when a caller
// uses one of those (or fires-and-forgets) this base promise is never awaited.
// Mark its rejection handled — the chosen view still surfaces the error — so a
// failed call isn't flagged as an unhandled rejection.
function basePromise<T, P extends APIPromise<T>>(
  inner: Promise<{ data: T; response: BirdResponse }>,
): P {
  const promise = inner.then((r) => r.data) as P;
  void promise.catch(() => {});
  promise.withResponse = () => inner;
  promise.safe = () => toSafe(inner);
  return promise;
}

export function apiPromise<T>(
  inner: Promise<{ data: T; response: BirdResponse }>,
): APIPromise<T> {
  return basePromise(inner);
}

/** One cursor-paginated page — the wire envelope shape (snake), verbatim. */
export interface CursorPage<T> {
  data: T[];
  /** Pass back as `starting_after` to advance. Null at the end. */
  next_cursor: string | null;
  /** Pass back as `ending_before` to step back. Null at the start. */
  prev_cursor: string | null;
  /** Refresh anchor; pass as `ending_before` later for items since this page. */
  refresh_cursor: string | null;
  /** Total across all pages — only when `include_total=true` was passed. */
  total?: number | null;
}

/**
 * List return (R1): `await` resolves the first page; `for await` walks every
 * item across all pages, fetching subsequent pages lazily.
 */
export interface PaginatedPromise<T> extends Promise<CursorPage<T>>, AsyncIterable<T> {
  withResponse(): Promise<{ data: CursorPage<T>; response: BirdResponse }>;
  /** Resolve the first page as `{ data, error }` instead of throwing. */
  safe(): Promise<SafeResult<CursorPage<T>>>;
}

export function paginate<T>(
  fetchPage: (cursor?: string) => Promise<{ data: CursorPage<T>; response: BirdResponse }>,
): PaginatedPromise<T> {
  const first = fetchPage();
  const promise = basePromise<CursorPage<T>, PaginatedPromise<T>>(first);
  promise[Symbol.asyncIterator] = async function* () {
    let result = await first;
    for (;;) {
      for (const item of result.data.data) yield item;
      if (result.data.next_cursor == null) return;
      result = await fetchPage(result.data.next_cursor);
    }
  };
  return promise;
}

// `.safe()` turns Bird failures (the BirdError hierarchy) into values. Anything
// else — a caller-initiated AbortError, or an unexpected non-Bird throw — keeps
// propagating, so `error` stays soundly typed as `BirdError`.
function toSafe<V>(
  inner: Promise<{ data: V; response: BirdResponse }>,
): Promise<SafeResult<V>> {
  return inner.then(
    ({ data, response }): SafeResult<V> => ({ data, error: null, response }),
    (error): SafeResult<V> => {
      if (error instanceof BirdError) return { data: null, error, response: null };
      throw error;
    },
  );
}
