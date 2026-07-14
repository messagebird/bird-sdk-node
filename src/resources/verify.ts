// `bird.verify` — the Verify product. `bird.verify.verifications.create(...)` starts
// a verification (sends a one-time passcode); `.check(...)` checks the passcode a
// recipient submits. Calls the generated SDK functions through the lifecycle core.

import {
  createVerification,
  createVerificationCheck,
} from "../generated/sdk.gen.js";
import type {
  Verification,
  VerificationCheckRequest,
  VerificationCheckResult,
  VerificationCreateRequest,
} from "../generated/types.gen.js";
import { Resource } from "./base.js";
import type { APIPromise, RequestOptions } from "../core/result.js";

/** A verification's current state: id, status, and the channel plan. */
export type { Verification, VerificationCheckResult };
/** Body for `bird.verify.verifications.create` — a recipient in `to`, plus optional `options`/`metadata`. */
export type VerificationCreateParams = VerificationCreateRequest;
/** Body for `bird.verify.verifications.check` — the recipient in `to` and the submitted `code`. */
export type VerificationCheckParams = VerificationCheckRequest;

export class VerificationsResource extends Resource {
  /**
   * Start a verification and send a one-time passcode to the recipient in `to`
   * (a `phone_number` over SMS, an `email_address` over email, or both). Calling
   * again for the same recipient re-sends the code after the cooldown rather than
   * starting a second verification. The passcode is never returned — submit the
   * recipient's entry with `check`.
   *
   * @example Start over SMS
   * const verification = await bird.verify.verifications.create({
   *   to: { phone_number: "+15551234567" },
   * });
   * console.log(verification.id, verification.status);
   */
  create(
    params: VerificationCreateParams,
    options?: RequestOptions,
  ): APIPromise<Verification> {
    return this.call<Verification>("POST", options, ({ signal, headers }) =>
      createVerification({ client: this.client, body: params, headers, signal }),
    );
  }

  /**
   * Check a passcode the recipient submitted. Identify the verification by the same
   * `to` recipient used to start it — no id needed. A wrong, expired, or already-used
   * code resolves with `success: false` and a `reason`, not an error.
   *
   * @example
   * const result = await bird.verify.verifications.check({
   *   to: { phone_number: "+15551234567" },
   *   code: "123456",
   * });
   * console.log(result.success);
   */
  check(
    params: VerificationCheckParams,
    options?: RequestOptions,
  ): APIPromise<VerificationCheckResult> {
    return this.call<VerificationCheckResult>(
      "POST",
      options,
      ({ signal, headers }) =>
        createVerificationCheck({ client: this.client, body: params, headers, signal }),
    );
  }
}

/** The Verify product namespace — holds the `verifications` collection. */
export class VerifyResource {
  readonly verifications: VerificationsResource;
  constructor(...args: ConstructorParameters<typeof Resource>) {
    this.verifications = new VerificationsResource(...args);
  }
}
