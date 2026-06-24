import type { VercelRequest, VercelResponse } from '@vercel/node';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await bird.email.send({
    from: 'onboarding@bird.dev',
    to: [req.body.email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  res.json({ sent: true });
}
