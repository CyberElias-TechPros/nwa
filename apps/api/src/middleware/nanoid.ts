/** Small URL-safe ID generator — no external deps. */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export function nanoid(length = 24): string {
  let id = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) id += ALPHABET[bytes[i]! % ALPHABET.length];
  return id;
}
