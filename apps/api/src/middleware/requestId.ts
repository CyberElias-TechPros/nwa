import type { MiddlewareHandler } from 'hono';
import { nanoid } from './nanoid.js';

export const requestId: MiddlewareHandler = async (c, next) => {
  const incoming = c.req.header('x-request-id');
  const id = incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : nanoid();
  c.set('requestId', id);
  await next();
  c.header('x-request-id', id);
};
