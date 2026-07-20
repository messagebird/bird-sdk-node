import { describe, it, expect } from "vitest";
import {
  BirdHTTPClient,
  type AttemptContext,
  type FetchOutcome,
} from "../../src/core/http.js";
import {
  BirdConflictError,
  BirdRateLimitError,
  BirdServiceUnavailableError,
  BirdTimeoutError,
  BirdValidationError,
} from "../../src/errors.js";

function ok<T>(data: T): FetchOutcome<T> {
  return { data, response: new Response(null, { status: 200 }) };
}

function fail(status: number, error: unknown, headers?: Record<string, string>): FetchOutcome<never> {
  return { error, response: new Response(null, { status, headers }) };
}

/** A thunk that yields scripted outcomes in order (last one repeats), recording each attempt's context. */
function scripted(outcomes: FetchOutcome<unknown>[]) {
  const contexts: AttemptContext[] = [];
  let i = 0;
  const thunk = (ctx: AttemptContext) => {
    contexts.push(ctx);
    const out = outcomes[Math.min(i, outcomes.length - 1)];
    i += 1;
    return Promise.resolve(out as FetchOutcome<unknown>);
  };
  return { thunk, contexts, calls: () => i };
}

const core = new BirdHTTPClient({ timeout: 1_000, maxRetries: 2 });

describe("BirdHTTPClient.request — retry matrix", () => {
  it("retries a 429 then returns on success", async () => {
    const s = scripted([
      fail(429, { type: "rate_limit_error" }, { "Retry-After": "0" }),
      ok({ id: "em_1" }),
    ]);
    const { data } = await core.request(s.thunk, { method: "POST" });
    expect(s.calls()).toBe(2);
    expect(data).toEqual({ id: "em_1" });
  });

  it("does NOT retry a 409 conflict", async () => {
    const s = scripted([fail(409, { type: "conflict_error" })]);
    await expect(core.request(s.thunk, { method: "POST" })).rejects.toBeInstanceOf(BirdConflictError);
    expect(s.calls()).toBe(1);
  });

  it("does NOT retry a 422 validation error", async () => {
    const s = scripted([fail(422, { type: "validation_error", details: [] })]);
    await expect(core.request(s.thunk, { method: "POST" })).rejects.toBeInstanceOf(BirdValidationError);
    expect(s.calls()).toBe(1);
  });

  it("exhausts retries on persistent 503 then throws the mapped error", async () => {
    const s = scripted([fail(503, { type: "service_unavailable_error" }, { "Retry-After": "0" })]);
    await expect(core.request(s.thunk, { method: "GET" })).rejects.toBeInstanceOf(BirdServiceUnavailableError);
    expect(s.calls()).toBe(3); // initial + 2 retries
  });
});

describe("BirdHTTPClient.request — idempotency", () => {
  it("generates a key for mutations and reuses it across retries", async () => {
    const s = scripted([
      fail(503, { type: "service_unavailable_error" }, { "Retry-After": "0" }),
      ok({ id: "em_1" }),
    ]);
    await core.request(s.thunk, { method: "POST" });
    expect(s.contexts).toHaveLength(2);
    expect(s.contexts[0].idempotencyKey).toBeTruthy();
    expect(s.contexts[1].idempotencyKey).toBe(s.contexts[0].idempotencyKey);
  });

  it("does not generate a key for GET", async () => {
    const s = scripted([ok({ ok: true })]);
    await core.request(s.thunk, { method: "GET" });
    expect(s.contexts[0].idempotencyKey).toBeUndefined();
  });

  it("uses a caller-supplied key verbatim", async () => {
    const s = scripted([ok({ ok: true })]);
    await core.request(s.thunk, { method: "POST", idempotencyKey: "order-123" });
    expect(s.contexts[0].idempotencyKey).toBe("order-123");
  });
});

describe("BirdHTTPClient.request — timeout & abort", () => {
  it("throws BirdTimeoutError when an attempt exceeds the per-attempt timeout", async () => {
    // Thunk never resolves except when its (composed) signal aborts.
    const thunk = (ctx: AttemptContext) =>
      new Promise<FetchOutcome<unknown>>((_, reject) => {
        ctx.signal.addEventListener("abort", () => reject(ctx.signal.reason), { once: true });
      });
    await expect(
      core.request(thunk, { method: "GET", timeout: 20, maxRetries: 0 }),
    ).rejects.toBeInstanceOf(BirdTimeoutError);
  });

  it("propagates a caller abort as AbortError without calling the thunk", async () => {
    const s = scripted([ok({ ok: true })]);
    const aborted = AbortSignal.abort();
    await expect(
      core.request(s.thunk, { method: "GET", signal: aborted }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(s.calls()).toBe(0);
  });
});
