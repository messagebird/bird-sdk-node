import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event);
  await bird.email.send({
    from: 'onboarding@messagebird.dev',
    to: [email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  return { sent: true };
});
