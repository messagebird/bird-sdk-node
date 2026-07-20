import { describe, it, expect } from "vitest";
import { BirdClient } from "../src/client.js";
import { BirdError, BirdNotFoundError, BirdPermissionError } from "../src/index.js";
import type { APIPromise, BirdResponse } from "../src/index.js";

function fakeFetch(route: (req: Request) => Response | Promise<Response>) {
  const calls: Request[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    calls.push(req);
    return route(req);
  }) as typeof fetch;
  return { fn, calls };
}

function jsonRes(status: number, body?: unknown): Response {
  return body === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const client = (fn: typeof fetch) => new BirdClient({ apiKey: "bk_eu1_x", fetch: fn });

describe(".safe()", () => {
  it("returns { data, error: null, response } on success", async () => {
    const { fn } = fakeFetch(() => jsonRes(200, { id: "x_1" }));
    const { data, error, response } = await client(fn)
      .request<{ id: string }>({ method: "GET", path: "/v1/things/x_1" })
      .safe();
    expect(error).toBeNull();
    expect(data?.id).toBe("x_1");
    expect(response?.status).toBe(200);
  });

  it("returns { data: null, error, response: null } on an API failure — never throws", async () => {
    const { fn } = fakeFetch(() => jsonRes(404, { type: "not_found_error", message: "nope" }));
    const { data, error, response } = await client(fn).request({ method: "GET", path: "/v1/things/missing" }).safe();
    expect(data).toBeNull();
    expect(response).toBeNull();
    expect(error).toBeInstanceOf(BirdNotFoundError);
    expect(error).toBeInstanceOf(BirdError);
  });

  it("still THROWS a caller-initiated abort (not swallowed into the result)", async () => {
    const { fn } = fakeFetch(() => jsonRes(200, {}));
    const ac = new AbortController();
    ac.abort();
    await expect(
      client(fn).request({ method: "GET", path: "/v1/things" }, { signal: ac.signal }).safe(),
    ).rejects.toThrow();
  });

  it("does not swallow into a BirdError: an abort rejection is the native AbortError", async () => {
    const { fn } = fakeFetch(() => jsonRes(200, {}));
    const ac = new AbortController();
    ac.abort();
    const err = await client(fn)
      .request({ method: "GET", path: "/v1/things" }, { signal: ac.signal })
      .safe()
      .catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(BirdError);
    expect((err as Error).name).toBe("AbortError");
  });

  it("list().safe() resolves the first page as a result with its response", async () => {
    const message = { id: "em_1", subject: "Hi", status: "accepted" };
    const { fn } = fakeFetch(() =>
      jsonRes(200, { data: [message], next_cursor: null, prev_cursor: null, refresh_cursor: null }),
    );
    const { data, error, response } = await client(fn).email.list().safe();
    expect(error).toBeNull();
    expect(data?.data[0].id).toBe("em_1");
    expect(response?.status).toBe(200);
  });

  it("list().safe() returns the error and a null response on failure", async () => {
    const { fn } = fakeFetch(() => jsonRes(403, { type: "permission_error", message: "denied" }));
    const { data, error, response } = await client(fn).email.list().safe();
    expect(data).toBeNull();
    expect(response).toBeNull();
    expect(error).toBeInstanceOf(BirdPermissionError);
  });
});

// Compile-time: the result narrows — error guards to BirdError with data/response
// null; the success branch has the value and a non-null response.
async function _narrows(p: APIPromise<{ id: string }>) {
  const { data, error, response } = await p.safe();
  if (error) {
    const e: BirdError = error;
    const r: null = response;
    void e;
    void r;
    return;
  }
  const id: string = data.id;
  const ok: BirdResponse = response;
  void id;
  void ok;
}
void _narrows;
