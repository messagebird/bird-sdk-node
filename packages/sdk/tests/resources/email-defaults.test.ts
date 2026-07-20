import { describe, it, expect } from "vitest";
import { BirdClient } from "../../src/client.js";

function capture() {
  const calls: Request[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(new Request(input, init));
    return new Response(JSON.stringify({ id: "em_1", status: "accepted" }), {
      status: 202,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fn, calls };
}

// Compile-time assertions — validated by `tsc` (the @ts-expect-error must fire).
// Never executed at runtime.
function _typeChecks() {
  const noDefault = new BirdClient({ apiKey: "bk_eu1_x" });
  // @ts-expect-error `from` is required when no email.from default is configured
  void noDefault.email.send({ to: ["a@b.com"], subject: "s", html: "<p>h</p>" });

  const withFrom = new BirdClient({ apiKey: "bk_eu1_x", email: { from: "noreply@acme.com" } });
  void withFrom.email.send({ to: ["a@b.com"], subject: "s", html: "<p>h</p>" }); // default fills `from`
  void withFrom.email.send({ from: "x@acme.com", to: ["a@b.com"], subject: "s", html: "h" }); // override
}
void _typeChecks;

describe("email channel defaults", () => {
  it("the compile-time type assertions hold (see @ts-expect-error)", () => {
    expect(typeof _typeChecks).toBe("function");
  });

  it("fills the channel default `from` when omitted", async () => {
    const { fn, calls } = capture();
    const bird = new BirdClient({ apiKey: "bk_eu1_x", fetch: fn, email: { from: "noreply@acme.com" } });
    await bird.email.send({ to: ["a@b.com"], subject: "s", html: "<p>h</p>" });
    expect((await calls[0].clone().json()).from).toBe("noreply@acme.com");
  });

  it("lets a per-send `from` override the default", async () => {
    const { fn, calls } = capture();
    const bird = new BirdClient({ apiKey: "bk_eu1_x", fetch: fn, email: { from: "noreply@acme.com" } });
    await bird.email.send({ from: "sales@acme.com", to: ["a@b.com"], subject: "s", html: "<p>h</p>" });
    expect((await calls[0].clone().json()).from).toBe("sales@acme.com");
  });

  it("merges multiple defaults (reply_to, category)", async () => {
    const { fn, calls } = capture();
    const bird = new BirdClient({
      apiKey: "bk_eu1_x",
      fetch: fn,
      email: { from: "n@acme.com", reply_to: ["ops@acme.com"], category: "marketing" },
    });
    await bird.email.send({ to: ["a@b.com"], subject: "s", html: "<p>h</p>" });
    const body = await calls[0].clone().json();
    expect(body.reply_to).toEqual(["ops@acme.com"]);
    expect(body.category).toBe("marketing");
  });
});
