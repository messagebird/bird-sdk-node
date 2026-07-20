// Nuxt auto-imports defineEventHandler and readBody from h3 at runtime.
// Declare them as globals so the nuxt.ts example type-checks without a full
// Nuxt compiler step.
import type { EventHandler, H3Event } from 'h3';

declare global {
  function defineEventHandler<T>(handler: (event: H3Event) => T): EventHandler<T>;
  function readBody<T = unknown>(event: H3Event): Promise<T>;
}
