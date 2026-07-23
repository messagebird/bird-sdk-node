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

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function bird(fn: typeof fetch) {
  return new BirdClient({ apiKey: "bk_eu1_test", fetch: fn });
}

describe("bird.email.stats.summary", () => {
  it("GETs the summary path and passes the window as query params", async () => {
    const body = { sends_accepted: 12, delivery: { delivered: 10 } };
    const { fn, calls } = fakeFetch([() => json(200, body)]);

    const s = await bird(fn).email.stats.summary({ from: "2026-05-01", to: "2026-05-31" });

    expect(s.sends_accepted).toBe(12);
    expect(calls[0].method).toBe("GET");
    const url = new URL(calls[0].url);
    expect(url.pathname).toMatch(/\/v1\/email\/stats\/summary$/);
    expect(url.searchParams.get("from")).toBe("2026-05-01");
    expect(url.searchParams.get("to")).toBe("2026-05-31");
  });
});

describe("bird.email.stats breakdowns", () => {
  it("byTag hits the tags path and forwards limit/sort", async () => {
    const { fn, calls } = fakeFetch([() => json(200, { data: [{ tag: "campaign:spring" }] })]);

    const { data } = await bird(fn).email.stats.byTag({
      from: "2026-05-01",
      to: "2026-05-31",
      sort: "delivered",
      limit: 10,
    });

    expect(data[0].tag).toBe("campaign:spring");
    const url = new URL(calls[0].url);
    expect(url.pathname).toMatch(/\/v1\/email\/stats\/tags$/);
    expect(url.searchParams.get("sort")).toBe("delivered");
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("maps each method to its route", async () => {
    const cases: Array<[keyof BirdClient["email"]["stats"], RegExp]> = [
      ["daily", /\/stats\/daily$/],
      ["hourly", /\/stats\/hourly$/],
      ["byCategory", /\/stats\/categories$/],
      ["bySendingIp", /\/stats\/sending-ips$/],
      ["bySendingDomain", /\/stats\/sending-domains$/],
      ["byRecipientDomain", /\/stats\/recipient-domains$/],
      ["byMailboxProvider", /\/stats\/mailbox-providers$/],
      ["byMailboxProviderRegion", /\/stats\/mailbox-provider-regions$/],
      ["byTemplate", /\/stats\/templates$/],
      ["byLocation", /\/stats\/locations$/],
      ["byClient", /\/stats\/clients$/],
      ["byBounceCode", /\/stats\/bounce-codes$/],
      ["byComplaintType", /\/stats\/complaint-types$/],
      ["byBroadcast", /\/stats\/broadcasts$/],
    ];

    for (const [method, pathRe] of cases) {
      const { fn, calls } = fakeFetch([() => json(200, { data: [] })]);
      await bird(fn).email.stats[method]();
      expect(calls[0].method).toBe("GET");
      expect(new URL(calls[0].url).pathname).toMatch(pathRe);
    }
  });
});
