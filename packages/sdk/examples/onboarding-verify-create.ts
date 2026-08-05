import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: "bk_XXXXXXXXXXXXXXXXXXXXXXXX" });

const verification = await bird.verify.verifications.create({
  to: { email_address: "user@example.com" },
});

console.log(verification.id, verification.status);
