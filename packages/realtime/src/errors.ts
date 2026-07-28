// The typed error hierarchy (ADR-0042 §1): one root so a caller can write a
// single `instanceof BirdRealtimeError` guard, plus a subclass per failure
// with structure worth branching on.

/** Root of every error this SDK throws. */
export class BirdRealtimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BirdRealtimeError";
  }
}

/** The customer's channel-authorization endpoint failed or answered garbage. */
export class RealtimeAuthError extends BirdRealtimeError {
  constructor(
    message: string,
    /** The endpoint the default authorizer called. */
    readonly endpoint: string,
    /** HTTP status of the response, or 0 when the request never completed. */
    readonly status: number,
  ) {
    super(message);
    this.name = "RealtimeAuthError";
  }
}
