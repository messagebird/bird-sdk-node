import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: "bk_XXXXXXXXXXXXXXXXXXXXXXXX" });

const msg = await bird.email.send({
  from: { email: "onboarding@messagebird.dev", name: "Bird" },
  to: ["delivered@messagebird.dev"],
  subject: "Hello World",
  html: "<p>You made your <strong>first email fly</strong>. Congratulations!</p>",
});

console.log(msg.id, msg.status);
