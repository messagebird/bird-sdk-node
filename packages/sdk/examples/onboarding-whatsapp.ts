import { BirdClient } from "@messagebird/sdk";

const bird = new BirdClient({ apiKey: "bk_XXXXXXXXXXXXXXXXXXXXXXXX" });

const msg = await bird.whatsapp.send({
  to: "+15551234567",
  template: {
    slug: "bird_delivery_update",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", name: "ref", text: "A1B2C3D4" },
          { type: "text", name: "date", text: "10 Jul 2026" },
        ],
      },
    ],
  },
});

console.log(msg.id, msg.status);
