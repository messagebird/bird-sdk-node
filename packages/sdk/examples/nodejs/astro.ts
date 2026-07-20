import type { APIRoute } from 'astro';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: import.meta.env.BIRD_API_KEY! });

export const POST: APIRoute = async ({ request }) => {
  const { email } = await request.json();
  await bird.email.send({
    from: 'onboarding@messagebird.dev',
    to: [email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  return new Response(JSON.stringify({ sent: true }));
};
