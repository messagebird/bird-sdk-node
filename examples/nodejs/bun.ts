import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

Bun.serve({
  async fetch(req) {
    if (req.method === 'POST' && new URL(req.url).pathname === '/welcome') {
      const { email } = await req.json();
      await bird.email.send({
        from: 'onboarding@bird.dev',
        to: [email],
        subject: 'Welcome to Bird',
        html: '<p>You are in.</p>',
      });
      return Response.json({ sent: true });
    }
    return new Response('Not found', { status: 404 });
  },
});
