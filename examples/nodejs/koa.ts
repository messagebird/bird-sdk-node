import bodyParser from '@koa/bodyparser';
import Router from '@koa/router';
import Koa from 'koa';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });
const app = new Koa();
const router = new Router();

router.post('/welcome', async (ctx) => {
  const { email } = ctx.request.body as { email: string };
  await bird.email.send({
    from: 'onboarding@bird.dev',
    to: [email],
    subject: 'Welcome to Bird',
    html: '<p>You are in.</p>',
  });
  ctx.body = { sent: true };
});

app.use(bodyParser()).use(router.routes());
