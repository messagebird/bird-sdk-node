import express from 'express';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });
const app = express();
app.use(express.json());

app.post('/welcome', async (req, res) => {
  await bird.email.send({
    from: 'onboarding@messagebird.dev',
    to: [req.body.email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  res.json({ sent: true });
});
