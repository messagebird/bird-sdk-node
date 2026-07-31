// `bird.verify` — the Verify product. `bird.verify.verifications.create(...)` starts
// a verification (sends a one-time passcode); `.check(...)` checks the passcode a
// recipient submits.

import { Resource } from "./base.js";
import { VerifyVerificationsResource } from "./verifyVerifications.gen.js";

/** The Verify product namespace — holds the `verifications` collection. */
export class VerifyResource {
  readonly verifications: VerifyVerificationsResource;
  constructor(...args: ConstructorParameters<typeof Resource>) {
    this.verifications = new VerifyVerificationsResource(...args);
  }
}
