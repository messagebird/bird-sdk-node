import type { NextApiRequest, NextApiResponse } from 'next';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await bird.email.send({
    from: 'onboarding@messagebird.dev',
    to: [req.body.email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  res.json({ sent: true });
}
