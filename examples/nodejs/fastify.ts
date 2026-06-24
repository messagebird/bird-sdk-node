import Fastify from 'fastify';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });
const fastify = Fastify();

fastify.post('/welcome', async (request) => {
  const { email } = request.body as { email: string };
  await bird.email.send({
    from: 'onboarding@bird.dev',
    to: [email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  return { sent: true };
});
