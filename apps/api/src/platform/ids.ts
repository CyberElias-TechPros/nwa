/**
 * ID generator for dev. W2 replaces this with ULID/crockford-base32.
 * Uses crypto.getRandomValues so it's safe in Workers.
 */
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'; // no o/0/l/1/i
export function publicId(prefix: string, length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return `${prefix}_${out}`;
}

/** Invite tokens are a bit longer and URL-safe. */
export function inviteToken(length = 22): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}
