// Error hierarchy for the Bird SDK (ADR-0042 §1).
//
// One class per error `type` (ADR-0016 — clients branch on the coarse `type`,
// never on individual codes). Two transport classes cover failures with no HTTP
// response. Scalar fields on the error objects are camelCase — these are
// SDK-constructed objects, not wire data (the Stripe/OpenAI-node convention:
// snake data, camel code). Nested wire payloads (validation `details`) pass
// through as-is.
//
// `mapResponseToError` is the single place a non-2xx response becomes a thrown
// error; the request core calls it once a response is terminal.

/** Root of the hierarchy. Catch this to catch anything the SDK throws. */
export class BirdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BirdError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Network-level failure with no HTTP response (DNS, refused, socket hangup). */
export class BirdConnectionError extends BirdError {
  constructor(message: string) {
    super(message);
    this.name = "BirdConnectionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A single attempt exceeded its timeout. Retryable. */
export class BirdTimeoutError extends BirdError {
  readonly timeoutMs: number;
  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "BirdTimeoutError";
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A webhook payload failed signature verification (bad signature, stale timestamp, malformed headers). */
export class BirdWebhookVerificationError extends BirdError {
  constructor(message: string) {
    super(message);
    this.name = "BirdWebhookVerificationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** One per-field validation failure (the `details` array on a 422). */
export interface ErrorDetail {
  /** Dotted field path, e.g. `to[0].email`, `subject`, `.`. */
  param: string;
  /** What is wrong with this field. */
  message: string;
}

/** Constructor fields shared by every API error, mapped from the wire body. */
export interface BirdAPIErrorFields {
  statusCode: number;
  /** Opaque, stable error code (`E#####`). */
  code: string;
  /** Coarse category — the value callers branch on. */
  type: string;
  /** Human-readable slug for logs. Paired with `code`, never replaces it. */
  errorName: string;
  message: string;
  /** Stable link to the docs page for this code. */
  docUrl: string;
  /** Correlation ID — also the `X-Request-Id` response header. */
  requestId: string;
  /** Offending field, when applicable. */
  param?: string;
  /** Verbatim code from a downstream system (SMTP reply, payment decline). */
  vendorCode?: string;
}

/** The server returned an error body. Base for every `type`-specific class. */
export class BirdAPIError extends BirdError {
  readonly statusCode: number;
  readonly code: string;
  readonly type: string;
  readonly errorName: string;
  readonly docUrl: string;
  readonly requestId: string;
  readonly param?: string;
  readonly vendorCode?: string;

  constructor(fields: BirdAPIErrorFields) {
    super(fields.message);
    this.name = "BirdAPIError";
    this.statusCode = fields.statusCode;
    this.code = fields.code;
    this.type = fields.type;
    this.errorName = fields.errorName;
    this.docUrl = fields.docUrl;
    this.requestId = fields.requestId;
    this.param = fields.param;
    this.vendorCode = fields.vendorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// One class per `type` enum value. The plain ones add nothing beyond the base;
// they exist so callers can `instanceof BirdNotFoundError` rather than compare
// strings, and so the special-field classes have peers.

/** 401 — authentication failed or missing. */
export class BirdAuthError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdAuthError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 403 — authenticated but not allowed. */
export class BirdPermissionError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdPermissionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 404 — resource does not exist. */
export class BirdNotFoundError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 409 — semantic conflict (e.g. a unique value already taken). */
export class BirdConflictError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdConflictError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 — malformed request. */
export class BirdBadRequestError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdBadRequestError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 402 — billing/balance problem. */
export class BirdBillingError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdBillingError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 412/428 — a precondition was not met. */
export class BirdPreconditionError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdPreconditionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 413 — request body too large. */
export class BirdPayloadTooLargeError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdPayloadTooLargeError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 500 — unexpected server error. */
export class BirdInternalError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdInternalError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 501 — endpoint not implemented. */
export class BirdNotImplementedError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdNotImplementedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 421 — request reached the wrong region (ADR-0036). */
export class BirdMisdirectedError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdMisdirectedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 503 — service temporarily unavailable. */
export class BirdServiceUnavailableError extends BirdAPIError {
  constructor(fields: BirdAPIErrorFields) {
    super(fields);
    this.name = "BirdServiceUnavailableError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 422 — field validation failed; `details` carries the per-field errors. */
export class BirdValidationError extends BirdAPIError {
  readonly details: ErrorDetail[];
  constructor(fields: BirdAPIErrorFields & { details: ErrorDetail[] }) {
    super(fields);
    this.name = "BirdValidationError";
    this.details = fields.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 429 — rate limited; `retryAfter` is the server-advised wait in seconds. */
export class BirdRateLimitError extends BirdAPIError {
  readonly retryAfter?: number;
  constructor(fields: BirdAPIErrorFields & { retryAfter?: number }) {
    super(fields);
    this.name = "BirdRateLimitError";
    this.retryAfter = fields.retryAfter;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Shape of the wire error body (`ErrorBody`), snake_case as sent. */
interface WireErrorBody {
  type?: string;
  code?: string;
  name?: string;
  message?: string;
  doc_url?: string;
  request_id?: string;
  param?: string;
  vendor_code?: string;
  details?: ErrorDetail[];
}

/**
 * Parse `Retry-After` (delta-seconds or HTTP-date) into whole seconds. A
 * negative or unparseable value yields `undefined` — a negative wait is
 * meaningless, so both the user-facing `retryAfter` and the retry loop treat it
 * as "no server advice". The single Retry-After parser; `retryDelay` builds on it.
 */
export function parseRetryAfter(headers?: Headers): number | undefined {
  const header = headers?.get("Retry-After");
  if (!header) return undefined;
  const seconds = Number(header);
  const value = Number.isFinite(seconds)
    ? seconds
    : (Date.parse(header) - Date.now()) / 1000;
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;
}

// Status → type fallback for non-JSON error bodies (proxy 502s, etc.) where the
// body carries no `type`.
function inferType(status: number): string {
  switch (status) {
    case 400:
      return "bad_request_error";
    case 401:
      return "auth_error";
    case 402:
      return "billing_error";
    case 403:
      return "permission_error";
    case 404:
      return "not_found_error";
    case 409:
      return "conflict_error";
    case 412:
    case 428:
      return "precondition_error";
    case 413:
      return "payload_too_large_error";
    case 421:
      return "misdirected_error";
    case 422:
      return "validation_error";
    case 429:
      return "rate_limit_error";
    case 501:
      return "not_implemented_error";
    case 503:
      return "service_unavailable_error";
    default:
      return status >= 500 ? "internal_error" : "bad_request_error";
  }
}

/**
 * Map a non-2xx response to the right `BirdAPIError` subclass. The single place
 * the SDK turns a wire error into a thrown error.
 */
export function mapResponseToError(
  status: number,
  body: unknown,
  headers?: Headers,
): BirdAPIError {
  // The API wraps errors as `{ "error": { … } }`; unwrap it (tolerating a bare
  // top-level body and a non-object body) so the wire type/code/message/request_id
  // are read, not defaulted. Without this the type was only ever inferred from the
  // HTTP status and code/request_id were dropped.
  const raw = (body ?? {}) as Record<string, unknown>;
  const b =
    (raw.error as WireErrorBody | undefined) ?? (raw as WireErrorBody) ?? {};
  const fields: BirdAPIErrorFields = {
    statusCode: status,
    code: b.code ?? "unknown",
    type: b.type ?? inferType(status),
    errorName: b.name ?? "",
    message: b.message ?? `Request failed with status ${status}`,
    docUrl: b.doc_url ?? "",
    requestId: b.request_id ?? headers?.get("X-Request-Id") ?? "",
    param: b.param,
    vendorCode: b.vendor_code,
  };

  switch (fields.type) {
    case "auth_error":
      return new BirdAuthError(fields);
    case "permission_error":
      return new BirdPermissionError(fields);
    case "not_found_error":
      return new BirdNotFoundError(fields);
    case "conflict_error":
      return new BirdConflictError(fields);
    case "bad_request_error":
      return new BirdBadRequestError(fields);
    case "billing_error":
      return new BirdBillingError(fields);
    case "precondition_error":
      return new BirdPreconditionError(fields);
    case "payload_too_large_error":
      return new BirdPayloadTooLargeError(fields);
    case "internal_error":
      return new BirdInternalError(fields);
    case "not_implemented_error":
      return new BirdNotImplementedError(fields);
    case "misdirected_error":
      return new BirdMisdirectedError(fields);
    case "service_unavailable_error":
      return new BirdServiceUnavailableError(fields);
    case "rate_limit_error":
      return new BirdRateLimitError({
        ...fields,
        retryAfter: parseRetryAfter(headers),
      });
    case "validation_error":
      return new BirdValidationError({ ...fields, details: b.details ?? [] });
    default:
      return new BirdAPIError(fields);
  }
}
