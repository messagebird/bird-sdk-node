// HAND-WRITTEN example source for GENERATED verify methods. Compiled +
// type-checked (examples/tsconfig.json includes **/*.ts, aliasing
// @messagebird/sdk -> ../src). Each `bird:snippet` region is the single source
// of truth for that key: the surfacegen TS writer injects it (unmarked) as the
// @example on the generated method, and docsnippet-gen extracts it here for the
// docs site + README.

import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function verifyVerificationsCreate() {
  const verification = await bird.verify.verifications.create({
    to: { phone_number: "+15551234567" },
  });
  console.log(verification.id, verification.status);
}

export async function verifyVerificationsCheck() {
  const result = await bird.verify.verifications.check({
    to: { phone_number: "+15551234567" },
    code: "123456",
  });
  console.log(result.success);
}
