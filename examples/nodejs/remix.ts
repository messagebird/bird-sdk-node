import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function action({ request }: ActionFunctionArgs) {
  const { email } = await request.json();
  await bird.email.send({
    from: 'onboarding@messagebird.dev',
    to: [email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  return json({ sent: true });
}
