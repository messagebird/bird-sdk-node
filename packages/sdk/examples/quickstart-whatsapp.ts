import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

const msg = await bird.whatsapp.send({
  to: "+15551234567",
  template: {
    name: "bird_otp",
    components: [
      { type: "body", parameters: [{ type: "text", text: "123456" }] },
    ],
  },
});

console.log(msg.id, msg.status);
