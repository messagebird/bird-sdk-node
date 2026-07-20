import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export async function welcomeEmail(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const { email } = (await request.json()) as { email: string };
  await bird.email.send({
    from: 'onboarding@messagebird.dev',
    to: [email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  return { jsonBody: { sent: true } };
}
