import { describe, it, expect } from "vitest";
import {
  mapResponseToError,
  parseRetryAfter,
  BirdAPIError,
  BirdAuthError,
  BirdConflictError,
  BirdInternalError,
  BirdPreconditionError,
  BirdRateLimitError,
  BirdValidationError,
} from "../src/errors.js";
import { ErrorBodySchema } from "../src/generated/schemas.gen.js";

function headers(init?: Record<string, string>): Headers {
  return new Headers(init);
}

describe("mapResponseToError", () => {
  it("maps a typed body to the right class and carries every field", () => {
    const err = mapResponseToError(401, {
      type: "auth_error",
      code: "E10001",
      name: "InvalidApiKey",
      message: "bad key",
      doc_url: "https://docs.bird.com/errors/E10001",
      request_id: "req_1",
    });
    expect(err).toBeInstanceOf(BirdAuthError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("E10001");
    expect(err.type).toBe("auth_error");
    expect(err.errorName).toBe("InvalidApiKey");
    expect(err.docUrl).toBe("https://docs.bird.com/errors/E10001");
    expect(err.requestId).toBe("req_1");
    expect(err.message).toBe("bad key");
  });

  it("attaches retryAfter on rate_limit_error from the Retry-After header", () => {
    const err = mapResponseToError(
      429,
      { type: "rate_limit_error", message: "slow down" },
      headers({ "Retry-After": "60" }),
    );
    expect(err).toBeInstanceOf(BirdRateLimitError);
    expect((err as BirdRateLimitError).retryAfter).toBe(60);
  });

  it("attaches details on validation_error", () => {
    const err = mapResponseToError(422, {
      type: "validation_error",
      details: [{ param: "to[0].email", message: "invalid address" }],
    });
    expect(err).toBeInstanceOf(BirdValidationError);
    expect((err as BirdValidationError).details).toEqual([
      { param: "to[0].email", message: "invalid address" },
    ]);
  });

  it("maps conflict_error → BirdConflictError", () => {
    expect(mapResponseToError(409, { type: "conflict_error" })).toBeInstanceOf(
      BirdConflictError,
    );
  });

  it("falls back on status when the body carries no type (non-JSON error)", () => {
    const err = mapResponseToError(502, undefined, headers());
    expect(err).toBeInstanceOf(BirdInternalError); // 5xx → internal_error
    expect(err.statusCode).toBe(502);
  });

  it("infers precondition_error for a bare 412/428 (no body type)", () => {
    expect(mapResponseToError(412, undefined, headers())).toBeInstanceOf(
      BirdPreconditionError,
    );
    expect(mapResponseToError(428, undefined, headers())).toBeInstanceOf(
      BirdPreconditionError,
    );
  });

  it("reads requestId from X-Request-Id when the body omits it", () => {
    const err = mapResponseToError(
      500,
      { type: "internal_error" },
      headers({ "X-Request-Id": "req_hdr" }),
    );
    expect(err.requestId).toBe("req_hdr");
  });

  it("returns the BirdAPIError base for an unknown type", () => {
    const err = mapResponseToError(418, {
      type: "teapot_error",
      message: "no coffee",
    });
    expect(err).toBeInstanceOf(BirdAPIError);
    expect(err.constructor.name).toBe("BirdAPIError");
  });

  it("surfaces remediation and next from the wire (ADR-0073)", () => {
    const next = [
      {
        operation: "assignDedicatedIp",
        description: "Assign a dedicated IP",
        scope: "email:write",
      },
    ];
    const err = mapResponseToError(422, {
      type: "validation_error",
      code: "E11005",
      message: "empty pool",
      remediation: "Assign a dedicated IP to the pool, then retry.",
      next,
      details: [],
    }) as BirdValidationError;
    expect(err.remediation).toBe(
      "Assign a dedicated IP to the pool, then retry.",
    );
    expect(err.next).toEqual(next);
  });
});

// The SDK error facade is hand-maintained (no generator emits it), so this is the
// guard: every ErrorBody wire field must be surfaced on the facade. A new wire
// field (e.g. a future recovery field) fails here until it is mapped in errors.ts.
describe("ErrorBody wire → facade coverage (drift guard)", () => {
  const wireToFacade: Record<string, string> = {
    type: "type",
    code: "code",
    name: "errorName",
    message: "message",
    param: "param",
    doc_url: "docUrl",
    request_id: "requestId",
    vendor_code: "vendorCode",
    details: "details",
    remediation: "remediation",
    next: "next",
  };

  it("maps every ErrorBody wire property to a facade field", () => {
    for (const key of Object.keys(ErrorBodySchema.properties)) {
      expect(
        wireToFacade,
        `wire field '${key}' is unmapped in errors.ts`,
      ).toHaveProperty(key);
    }
  });
});

describe("parseRetryAfter", () => {
  it("parses delta-seconds", () => {
    expect(parseRetryAfter(headers({ "Retry-After": "60" }))).toBe(60);
  });

  it("returns undefined for a negative value (no negative wait)", () => {
    expect(parseRetryAfter(headers({ "Retry-After": "-5" }))).toBeUndefined();
  });

  it("returns undefined for an unparseable value", () => {
    expect(parseRetryAfter(headers({ "Retry-After": "soon" }))).toBeUndefined();
  });

  it("parses an HTTP-date into seconds from now", () => {
    const future = new Date(Date.now() + 120_000).toUTCString();
    const value = parseRetryAfter(headers({ "Retry-After": future }));
    expect(value).toBeGreaterThanOrEqual(118);
    expect(value).toBeLessThanOrEqual(120);
  });

  it("a negative Retry-After leaves retryAfter unset on the rate-limit error", () => {
    const err = mapResponseToError(
      429,
      { type: "rate_limit_error" },
      headers({ "Retry-After": "-5" }),
    );
    expect((err as BirdRateLimitError).retryAfter).toBeUndefined();
  });
});
