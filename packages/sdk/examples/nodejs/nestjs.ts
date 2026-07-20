import { Controller, Post, Body } from '@nestjs/common';

import { BirdClient } from '@messagebird/sdk';

const bird = new BirdClient({ apiKey: process.env.BIRD_API_KEY! });

@Controller()
export class EmailController {
  @Post('welcome')
  async welcome(@Body('email') email: string) {
    await bird.email.send({
      from: 'onboarding@messagebird.dev',
      to: [email],
      subject: 'Welcome to Bird',
      html: '<p>You are in.</p>',
    });
    return { sent: true };
  }
}
