// Base for resource wrappers. Each public method builds a typed hey-api SDK
// call and runs it through the lifecycle core, returning an APIPromise (single)
// or PaginatedPromise (list). Resources stay thin over `call`/`paginated` so the
// per-operation logic could later be extracted to standalone tree-shakeable
// functions without a rewrite.

import type { Client } from "../generated/client/index.js";
import type { AttemptContext, BirdHTTPClient, FetchOutcome, RequestLifecycleOptions } from "../core/http.js";
import {
  apiPromise,
  paginate,
  type APIPromise,
  type CursorPage,
  type PaginatedPromise,
  type RequestOptions,
} from "../core/result.js";

/** Resolved per-attempt inputs handed to the hey-api SDK call. */
export interface CallContext {
  signal: AbortSignal;
  /** Merged headers: caller `headers` plus the resolved `Idempotency-Key`. */
  headers: Record<string, string>;
}

export abstract class Resource {
  constructor(
    protected readonly core: BirdHTTPClient,
    protected readonly client: Client,
  ) {}

  /** Run a single typed call through the lifecycle. */
  protected call<T>(
    method: string,
    options: RequestOptions | undefined,
    invoke: (ctx: CallContext) => Promise<FetchOutcome<T>>,
  ): APIPromise<T> {
    return apiPromise(
      this.core.request<T>((ctx) => invoke(callContext(ctx, options)), lifecycle(method, options)),
    );
  }

  /** Run a cursor-paginated list through the lifecycle (each page retried independently). */
  protected paginated<T>(
    method: string,
    options: RequestOptions | undefined,
    invoke: (ctx: CallContext, cursor: string | undefined) => Promise<FetchOutcome<CursorPage<T>>>,
  ): PaginatedPromise<T> {
    return paginate<T>((cursor) =>
      this.core.request<CursorPage<T>>(
        (ctx) => invoke(callContext(ctx, options), cursor),
        lifecycle(method, options),
      ),
    );
  }
}

function callContext(ctx: AttemptContext, options: RequestOptions | undefined): CallContext {
  return { signal: ctx.signal, headers: mergeHeaders(ctx.idempotencyKey, options?.headers) };
}

function lifecycle(method: string, options: RequestOptions | undefined): RequestLifecycleOptions {
  return {
    method,
    idempotencyKey: options?.idempotencyKey,
    signal: options?.signal,
    timeout: options?.timeout,
    maxRetries: options?.maxRetries,
  };
}

function mergeHeaders(
  idempotencyKey: string | undefined,
  extra: Record<string, string> | undefined,
): Record<string, string> {
  return {
    ...extra,
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  };
}
