import { Hono } from 'hono';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });
const app = new Hono();

app.post('/welcome', async (c) => {
  const { email } = await c.req.json();
  await bird.email.send({
    from: 'onboarding@messagebird.dev',
    to: [email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  return c.json({ sent: true });
});
