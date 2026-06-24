import type { APIGatewayProxyHandler } from 'aws-lambda';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

export const handler: APIGatewayProxyHandler = async (event) => {
  const { email } = JSON.parse(event.body ?? '{}');
  await bird.email.send({
    from: 'onboarding@messagebird.dev',
    to: [email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  return { statusCode: 200, body: JSON.stringify({ sent: true }) };
};
