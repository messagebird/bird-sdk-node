import { describe, it, expect } from "vitest";
import { BirdClient } from "../src/client.js";
import { BirdNotFoundError } from "../src/index.js";

function fakeFetch(route: (req: Request) => Response) {
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
    : new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
}

const client = (fn: typeof fetch) =>
  new BirdClient({ apiKey: "bk_eu1_secret", fetch: fn });

describe("bird.request (escape hatch)", () => {
  describe("path validation — rejects authority-hijacking paths before fetch", () => {
    it("rejects a userinfo-style path that would redirect to an attacker host", () => {
      const { fn, calls } = fakeFetch(() => jsonRes(200, {}));
      const bird = client(fn);
      expect(() =>
        bird.request({ method: "GET", path: "@attacker.example/collect" }),
      ).toThrow(TypeError);
      expect(() =>
        bird.request({ method: "GET", path: "@attacker.example/collect" }),
      ).toThrow(/single `\/`/);
      expect(calls).toHaveLength(0);
    });

    it("rejects a protocol-relative path (//evil)", () => {
      const { fn, calls } = fakeFetch(() => jsonRes(200, {}));
      const bird = client(fn);
      expect(() =>
        bird.request({ method: "GET", path: "//attacker.example/collect" }),
      ).toThrow(TypeError);
      expect(() =>
        bird.request({ method: "GET", path: "//attacker.example/collect" }),
      ).toThrow(/single `\/`/);
      expect(calls).toHaveLength(0);
    });

    it("rejects an absolute URL (https://evil)", () => {
      const { fn, calls } = fakeFetch(() => jsonRes(200, {}));
      const bird = client(fn);
      expect(() =>
        bird.request({
          method: "GET",
          path: "https://attacker.example/collect",
        }),
      ).toThrow(TypeError);
      expect(() =>
        bird.request({
          method: "GET",
          path: "https://attacker.example/collect",
        }),
      ).toThrow(/single `\/`/);
      expect(calls).toHaveLength(0);
    });

    it("rejects a bare relative path with no leading slash", () => {
      const { fn, calls } = fakeFetch(() => jsonRes(200, {}));
      const bird = client(fn);
      expect(() =>
        bird.request({ method: "GET", path: "v1/email/domains" }),
      ).toThrow(TypeError);
      expect(() =>
        bird.request({ method: "GET", path: "v1/email/domains" }),
      ).toThrow(/single `\/`/);
      expect(calls).toHaveLength(0);
    });

    it("allows a valid absolute path and issues a fetch to the configured origin", async () => {
      const { fn, calls } = fakeFetch(() => jsonRes(200, { ok: true }));
      await client(fn).request({ method: "GET", path: "/v1/email/domains" });
      expect(calls).toHaveLength(1);
      expect(new URL(calls[0].url).origin).toBe(
        "https://eu1.platform.bird.com",
      );
      expect(new URL(calls[0].url).pathname).toBe("/v1/email/domains");
      expect(calls[0].headers.get("Authorization")).toBe(
        "Bearer bk_eu1_secret",
      );
    });
  });

  it("GET returns the caller-typed body, authed, on the right path, with no idempotency key", async () => {
    const { fn, calls } = fakeFetch(() =>
      jsonRes(200, { domains: [{ id: "dom_1" }] }),
    );
    const out = await client(fn).request<{ domains: { id: string }[] }>({
      method: "GET",
      path: "/v1/email/domains",
    });
    expect(out.domains[0].id).toBe("dom_1");
    expect(calls[0].method).toBe("GET");
    expect(new URL(calls[0].url).pathname).toBe("/v1/email/domains");
    expect(calls[0].headers.get("Authorization")).toBe("Bearer bk_eu1_secret");
    expect(calls[0].headers.get("Idempotency-Key")).toBeNull();
    expect(calls[0].headers.get("Content-Type")).toBeNull();
  });

  it("POST auto-generates an idempotency key, sets Content-Type, and serializes the body", async () => {
    const { fn, calls } = fakeFetch(() => jsonRes(201, { id: "x_1" }));
    await client(fn).request({
      method: "POST",
      path: "/v1/things",
      body: { name: "a" },
    });
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers.get("Idempotency-Key")).toBeTruthy();
    expect(calls[0].headers.get("Content-Type")).toBe("application/json");
    expect(await calls[0].clone().json()).toEqual({ name: "a" });
  });

  it("serializes query params, skipping undefined", async () => {
    const { fn, calls } = fakeFetch(() => jsonRes(200, {}));
    await client(fn).request({
      method: "GET",
      path: "/v1/things",
      query: { limit: 10, active: true, cursor: undefined },
    });
    const url = new URL(calls[0].url);
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("active")).toBe("true");
    expect(url.searchParams.has("cursor")).toBe(false);
  });

  it("uses a caller-supplied idempotency key", async () => {
    const { fn, calls } = fakeFetch(() => jsonRes(201, {}));
    await client(fn).request(
      { method: "POST", path: "/v1/things" },
      { idempotencyKey: "ik_caller" },
    );
    expect(calls[0].headers.get("Idempotency-Key")).toBe("ik_caller");
  });

  it("merges caller headers but SDK-internal auth wins", async () => {
    const { fn, calls } = fakeFetch(() => jsonRes(200, {}));
    await client(fn).request(
      { method: "GET", path: "/v1/things" },
      { headers: { "X-Trace": "t1", Authorization: "Bearer attacker" } },
    );
    expect(calls[0].headers.get("X-Trace")).toBe("t1");
    expect(calls[0].headers.get("Authorization")).toBe("Bearer bk_eu1_secret");
  });

  it("maps a non-2xx body to the typed error", async () => {
    const { fn } = fakeFetch(() =>
      jsonRes(404, { type: "not_found_error", message: "nope" }),
    );
    await expect(
      client(fn).request({ method: "GET", path: "/v1/things/missing" }),
    ).rejects.toBeInstanceOf(BirdNotFoundError);
  });

  it("resolves to undefined on 204", async () => {
    const { fn } = fakeFetch(() => jsonRes(204));
    const out = await client(fn).request({
      method: "DELETE",
      path: "/v1/things/x_1",
    });
    expect(out).toBeUndefined();
  });

  it(".withResponse() exposes the raw response", async () => {
    const { fn } = fakeFetch(() => jsonRes(200, { ok: true }));
    const { data, response } = await client(fn)
      .request<{ ok: boolean }>({ method: "GET", path: "/v1/things" })
      .withResponse();
    expect(data.ok).toBe(true);
    expect(response.status).toBe(200);
  });
});
