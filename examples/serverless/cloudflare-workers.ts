import { BirdClient } from '@messagebird/sdk';

interface Env {
  BIRD_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bird = new BirdClient({ apiKey: env.BIRD_API_KEY });
    const { email } = await request.json<{ email: string }>();
    await bird.email.send({
      from: 'onboarding@bird.dev',
      to: [email],
      subject: 'Welcome to Bird',
      html: '<p>You are in.</p>',
    });
    return Response.json({ sent: true });
  },
};
