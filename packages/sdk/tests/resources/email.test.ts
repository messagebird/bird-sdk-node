import { describe, it, expect } from "vitest";
import { BirdClient } from "../../src/client.js";

// End-to-end through the real stack (client → resource → core → generated SDK);
// only the transport `fetch` is faked.
function fakeFetch(responses: Array<() => Response>) {
  const calls: Request[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    calls.push(req);
    return responses[Math.min(calls.length - 1, responses.length - 1)]();
  }) as typeof fetch;
  return { fn, calls };
}

function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function bird(fn: typeof fetch) {
  return new BirdClient({ apiKey: "bk_eu1_test", fetch: fn });
}

const message = { id: "em_1", from: "a@bird.com", to: ["b@bird.com"], subject: "Hi", status: "accepted" };

describe("bird.email.send", () => {
  it("returns the message and auto-sets an Idempotency-Key on the POST", async () => {
    const { fn, calls } = fakeFetch([() => json(202, message)]);
    const email = await bird(fn).email.send({ from: "a@bird.com", to: ["b@bird.com"], subject: "Hi", html: "<p>hi</p>" });

    expect(email.id).toBe("em_1");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers.get("Idempotency-Key")).toBeTruthy();
  });

  it("exposes requestId via .withResponse()", async () => {
    const { fn } = fakeFetch([() => json(202, message, { "X-Request-Id": "req_42" })]);
    const { data, response } = await bird(fn)
      .email.send({ from: "a@bird.com", to: ["b@bird.com"], subject: "Hi", html: "<p>hi</p>" })
      .withResponse();

    expect(data.id).toBe("em_1");
    expect(response.requestId).toBe("req_42");
  });

  it("honors a caller-supplied idempotency key", async () => {
    const { fn, calls } = fakeFetch([() => json(202, message)]);
    await bird(fn).email.send(
      { from: "a@bird.com", to: ["b@bird.com"], subject: "Hi", html: "<p>hi</p>" },
      { idempotencyKey: "order-7" },
    );
    expect(calls[0].headers.get("Idempotency-Key")).toBe("order-7");
  });
});

describe("bird.email.get", () => {
  it("fetches a message by id", async () => {
    const { fn, calls } = fakeFetch([() => json(200, message)]);
    const email = await bird(fn).email.get("em_1");

    expect(email.id).toBe("em_1");
    expect(calls[0].method).toBe("GET");
    expect(new URL(calls[0].url).pathname).toMatch(/\/v1\/email\/messages\/em_1$/);
  });
});

describe("bird.email.list", () => {
  const page1 = { data: [{ id: "em_1" }, { id: "em_2" }], next_cursor: "c1", prev_cursor: null, refresh_cursor: "r1" };
  const page2 = { data: [{ id: "em_3" }], next_cursor: null, prev_cursor: "c0", refresh_cursor: "r2" };

  it("await resolves the first page", async () => {
    const { fn } = fakeFetch([() => json(200, page1)]);
    const page = await bird(fn).email.list({ limit: 2 });
    expect(page.data.map((m) => m.id)).toEqual(["em_1", "em_2"]);
    expect(page.next_cursor).toBe("c1");
  });

  it("for-await auto-paginates across pages, advancing with starting_after", async () => {
    const { fn, calls } = fakeFetch([() => json(200, page1), () => json(200, page2)]);
    const ids: string[] = [];
    for await (const m of bird(fn).email.list({ limit: 2 })) ids.push(m.id!);

    expect(ids).toEqual(["em_1", "em_2", "em_3"]);
    expect(calls).toHaveLength(2);
    expect(new URL(calls[1].url).searchParams.get("starting_after")).toBe("c1");
  });
});
