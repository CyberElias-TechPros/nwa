/**
 * Device identification middleware (T-W2-04, tier 0+1).
 *
 * On every request:
 *   - Reads `nwa_dk` cookie (preferred) or `X-Device-Key` header.
 *   - If missing, mints a new 16-byte CSPRNG deviceKey and sets it as an
 *     HTTP-only, Secure, SameSite=Lax cookie named `nwa_dk`. Also echoes it
 *     in the `X-Device-Key` response header so clients that don't honour
 *     cookies (Android, tests) can capture and replay it.
 *   - Places the key into ctx.var.deviceKey so routes can bind participants.
 *
 * The deviceKey does NOT authenticate a human — it identifies a browser/
 * device. Real auth (email magic link) lands in W5.
 */
import crypto from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../db/factory.js';

const COOKIE_NAME = 'nwa_dk';
const HEADER_NAME = 'x-device-key';
// 400 days is under Chrome's 400-day cookie cap. Works for "keep me signed in".
const MAX_AGE_SEC = 400 * 86_400;

export function deviceKeyMiddleware(): MiddlewareHandler<Env> {
  return async (c, next) => {
    let key: string | undefined = c.req.header(HEADER_NAME) ?? undefined;
    if (!key) {
      const cookie = c.req.header('cookie') ?? '';
      const match = cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE_NAME}=`));
      if (match) key = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
    }
    const isNew = !key;
    if (!key) key = crypto.randomBytes(16).toString('hex');
    // key is now guaranteed non-empty.
    const dk: string = key;
    c.set('deviceKey', dk);
    await next();
    if (isNew) {
      const origin = c.req.header('origin') ?? '';
      const secure = origin.startsWith('https://') || c.req.header('x-forwarded-proto') === 'https';
      c.header(
        'set-cookie',
        `${COOKIE_NAME}=${encodeURIComponent(dk)}; Path=/; Max-Age=${MAX_AGE_SEC}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
      );
      c.header(HEADER_NAME, dk);
    }
  };
}
