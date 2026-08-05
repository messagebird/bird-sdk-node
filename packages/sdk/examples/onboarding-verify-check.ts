import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: "bk_XXXXXXXXXXXXXXXXXXXXXXXX" });

const result = await bird.verify.verifications.check({
  to: { email_address: "user@example.com" },
  code: "123456",
});

console.log(result.success);
