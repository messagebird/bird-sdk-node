import { describe, it, expect } from "vitest";
import {
  BirdClient,
  BirdError,
  BirdAPIError,
  BirdAuthError,
  BirdRateLimitError,
  regionFromApiKey,
  baseUrlForRegion,
} from "../src/index.js";

const errorFields = {
  code: "E1",
  type: "bad_request_error",
  errorName: "Bad",
  message: "msg",
  docUrl: "",
  requestId: "",
};

describe("BirdClient", () => {
  it("constructs with required options", () => {
    const client = new BirdClient({ apiKey: "bk_us1_test123" });
    expect(client).toBeInstanceOf(BirdClient);
  });

  it("constructs with custom base URL", () => {
    const client = new BirdClient({
      apiKey: "bk_us1_test123",
      baseUrl: "http://localhost:8080",
    });
    expect(client).toBeInstanceOf(BirdClient);
  });

  it("throws when the region cannot be determined", () => {
    expect(() => new BirdClient({ apiKey: "bk_live_legacy" })).toThrow(/region/i);
  });

  it("accepts an unparseable key when baseUrl is given", () => {
    const client = new BirdClient({
      apiKey: "bk_live_legacy",
      baseUrl: "http://localhost:8080",
    });
    expect(client).toBeInstanceOf(BirdClient);
  });
});

describe("region resolution", () => {
  it("extracts the region from a key prefix", () => {
    expect(regionFromApiKey("bk_eu1_abc123")).toBe("eu1");
    expect(regionFromApiKey("bk_us1_abc123")).toBe("us1");
  });

  it("returns undefined for keys without a region segment", () => {
    expect(regionFromApiKey("bk_live_abc123")).toBeUndefined();
    expect(regionFromApiKey("bk_LIVE_x_y")).toBeUndefined();
    expect(regionFromApiKey("garbage")).toBeUndefined();
  });

  it("builds the regional data-plane host", () => {
    expect(baseUrlForRegion("eu1")).toBe("https://eu1.platform.bird.com");
  });
});

describe("Error hierarchy", () => {
  it("BirdAPIError extends BirdError", () => {
    const err = new BirdAPIError({ ...errorFields, statusCode: 400 });
    expect(err).toBeInstanceOf(BirdError);
    expect(err).toBeInstanceOf(BirdAPIError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("E1");
  });

  it("BirdAuthError extends BirdAPIError", () => {
    const err = new BirdAuthError({ ...errorFields, statusCode: 401, type: "auth_error" });
    expect(err).toBeInstanceOf(BirdAPIError);
    expect(err.statusCode).toBe(401);
  });

  it("BirdRateLimitError extends BirdAPIError", () => {
    const err = new BirdRateLimitError({ ...errorFields, statusCode: 429, type: "rate_limit_error", retryAfter: 30 });
    expect(err).toBeInstanceOf(BirdAPIError);
    expect(err.statusCode).toBe(429);
    expect(err.retryAfter).toBe(30);
  });
});
