// The first send a customer makes from the dashboard's onboarding step. Unlike
// quickstart-email.ts this carries the key inline: the dashboard fills it with
// the workspace's real key, so the placeholder is what a reader sees before it
// is substituted, not advice to hardcode a secret.
import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: "bk_XXXXXXXXXXXXXXXXXXXXXXXX" });

const msg = await bird.email.send({
  from: { email: "onboarding@messagebird.dev", name: "Bird" },
  to: ["delivered@messagebird.dev"],
  subject: "Hello World",
  html: "<p>You made your <strong>first email fly</strong>. Congratulations!</p>",
});

console.log(msg.id, msg.status);
