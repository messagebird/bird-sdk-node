import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({
  apiKey: process.env.BIRD_API_KEY!,
  realtime: { key: "your-app-key", secret: "your-app-secret" },
});

await bird.realtime.publish("rap_01krdgeqcxet5s7t44vh8rt9mg", {
  event: "order-updated",
  channels: ["orders"],
  data: { id: 42, status: "shipped" },
});

console.log("published to orders");
