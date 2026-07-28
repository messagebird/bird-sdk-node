import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAuthorizer } from "../src/auth.js";
import { RealtimeAuthError } from "../src/errors.js";

const params = { connectionId: "77.1", channelName: "private-x" };

function mockFetch(status: number, body: unknown, json = true) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (!json) throw new SyntaxError("not json");
      return body;
    },
  })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("defaultAuthorizer", () => {
  it("returns a guarded auth payload from a valid response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { auth: "key:sig", member_data: "{}" }),
    );
    const auth = await defaultAuthorizer("/bird/auth")(params);
    expect(auth).toEqual({ auth: "key:sig", member_data: "{}" });
  });

  it("rejects a 200 without an auth string (untrusted input is guarded, not cast)", async () => {
    vi.stubGlobal("fetch", mockFetch(200, {}));
    await expect(
      defaultAuthorizer("/bird/auth")(params),
    ).rejects.toBeInstanceOf(RealtimeAuthError);
  });

  it("rejects a 200 with a non-JSON body", async () => {
    vi.stubGlobal("fetch", mockFetch(200, null, false));
    await expect(defaultAuthorizer("/bird/auth")(params)).rejects.toThrow(
      /non-JSON/,
    );
  });

  it("carries endpoint and status on failure", async () => {
    vi.stubGlobal("fetch", mockFetch(403, {}));
    const err = await defaultAuthorizer("/bird/auth")(params).catch(
      (e) => e as RealtimeAuthError,
    );
    expect(err).toBeInstanceOf(RealtimeAuthError);
    expect(err.endpoint).toBe("/bird/auth");
    expect(err.status).toBe(403);
  });

  it("refuses a cross-origin endpoint without the explicit opt-in", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { auth: "key:sig" }));
    await expect(
      defaultAuthorizer("https://elsewhere.example/auth")(params),
    ).rejects.toThrow(/allowCrossOriginAuth/);
  });

  it("with the opt-in, calls cross-origin but withholds authHeaders", async () => {
    const fetchMock = mockFetch(200, { auth: "key:sig" });
    vi.stubGlobal("fetch", fetchMock);
    await defaultAuthorizer(
      "https://elsewhere.example/auth",
      { Authorization: "Bearer secret" },
      true,
    )(params);
    const headers = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]![1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined(); // credentials stay same-origin
  });
});
