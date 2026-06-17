import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

const msg = await bird.email.send({
  from: { email: "onboarding@messagebird.dev", name: "Bird" },
  to: ["delivered@messagebird.dev"],
  subject: "Hello from Bird",
  html: "<p>My first Bird email.</p>",
});

console.log(msg.id, msg.status);
