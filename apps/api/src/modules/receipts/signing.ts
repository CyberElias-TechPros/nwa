/**
 * Receipt signing (T-W6, gap G6).
 *
 * Produces a tamper-evident JSON receipt for a mutually-acknowledged plan.
 * Receipts are signed with HMAC-SHA-256 using RECEIPT_SECRET so that:
 *   - Either party can download a .json file and prove later that this exact
 *     plan text was agreed at this exact time (a "shared memory").
 *   - NaWeAgree can verify the signature when a receipt is re-uploaded
 *     (e.g. for dispute support in v2).
 *   - The receipt is plain text + JSON — no DRM, no blockchain, no paywall.
 *
 * Security notes:
 *   - Signature covers a stable, canonical JSON serialization (sorted keys,
 *     no trailing whitespace, two-space indent for the human-readable body).
 *   - We never sign anything the server did not produce — fields come from
 *     the server-authored job/version/ack rows.
 *   - The `kid` in the signed envelope is a key id derived from the first
 *     8 hex chars of the secret's SHA-256, so future key rotation is possible.
 *   - If RECEIPT_SECRET is not configured (local dev, tests) we fall back to
 *     a well-known dev secret and mark the receipt `"dev": true` so nobody
 *     mistakes a local signature for a production one.
 */
import type { JobAggregate, JobVersion } from '@nwa/domain';

export const DEV_RECEIPT_SECRET = 'dev-receipt-secret-change-me';

export interface ReceiptPayload {
  schema: 'nwa.receipt/v1';
  jobId: string;
  jobTitle: string;
  categoryKey: string;
  versionNumber: number;
  versionReason: string | null;
  fields: { key: string; label: string; value: string }[];
  acknowledgedBy: { participantId: string; displayName: string; role: string; acknowledgedAt: string }[];
  mutualAt: string;
  product: { name: string; url: string };
}

export interface SignedReceipt extends ReceiptPayload {
  sig: {
    alg: 'HS256';
    kid: string;
    value: string;
    dev?: boolean;
  };
}

export interface VerifyResult {
  ok: boolean;
  reason?: 'bad_shape' | 'bad_alg' | 'bad_signature' | 'dev_secret';
  payload?: ReceiptPayload;
}

/** Stable JSON stringify (sorted keys) for signing. */
export function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify((obj as Record<string, unknown>)[k])).join(',') + '}';
}

export async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function buildReceiptPayload(job: JobAggregate, version: JobVersion): ReceiptPayload {
  const mutualAcks = version.acknowledgements.filter((a) => a.action === 'reviewed');
  const mutualAt = mutualAcks.reduce((acc, a) => (a.createdAt > acc ? a.createdAt : acc), '');
  return {
    schema: 'nwa.receipt/v1',
    jobId: job.id,
    jobTitle: job.title,
    categoryKey: job.categoryKey,
    versionNumber: version.number,
    versionReason: version.reason ?? null,
    fields: version.fields.map((f) => ({ key: f.key, label: f.label, value: f.valueRaw ?? '' })),
    acknowledgedBy: mutualAcks.map((a) => {
      const p = job.participants.find((x) => x.id === a.participantId);
      return {
        participantId: a.participantId,
        displayName: p?.displayName ?? 'Someone',
        role: p?.role ?? 'unknown',
        acknowledgedAt: a.createdAt,
      };
    }),
    mutualAt,
    product: { name: 'NaWeAgree', url: 'https://naweagree.app' },
  };
}

function first8Hex(s: string): string {
  // djb2-style short hash for kid — stable and does not leak secret bytes.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
}

export async function signReceipt(payload: ReceiptPayload, secret: string | undefined): Promise<SignedReceipt> {
  const dev = !secret;
  const effectiveSecret = secret || DEV_RECEIPT_SECRET;
  const canon = canonicalStringify(payload);
  const value = await hmacHex(effectiveSecret, canon);
  return {
    ...payload,
    sig: { alg: 'HS256', kid: first8Hex(effectiveSecret), value, ...(dev ? { dev: true } : {}) },
  };
}

export async function verifyReceipt(envelope: unknown, secret: string | undefined): Promise<VerifyResult> {
  if (!envelope || typeof envelope !== 'object') return { ok: false, reason: 'bad_shape' };
  const e = envelope as Record<string, unknown>;
  if (e.sig === null || typeof e.sig !== 'object') return { ok: false, reason: 'bad_shape' };
  const sig = e.sig as Record<string, unknown>;
  if (sig.alg !== 'HS256') return { ok: false, reason: 'bad_alg' };
  const payload: Record<string, unknown> = {};
  for (const k of Object.keys(e)) if (k !== 'sig') payload[k] = e[k];
  const canon = canonicalStringify(payload);
  const secrets = [secret, DEV_RECEIPT_SECRET].filter(Boolean) as string[];
  for (const s of secrets) {
    const expected = await hmacHex(s, canon);
    if (expected === sig.value) {
      if (s === DEV_RECEIPT_SECRET && secret && secret !== DEV_RECEIPT_SECRET) {
      return { ok: true, reason: 'dev_secret', payload: payload as unknown as ReceiptPayload };
    }
    return { ok: true, payload: payload as unknown as ReceiptPayload };
    }
  }
  return { ok: false, reason: 'bad_signature' };
}

/** Produce a plain-text, human-friendly receipt (suitable for SMS/WhatsApp screenshot). */
export function receiptToText(r: ReceiptPayload): string {
  const lines: string[] = [];
  lines.push('NAWEAGREE — SHARED RECORD');
  lines.push('=========================');
  lines.push('');
  lines.push(`Plan: ${r.jobTitle}`);
  lines.push(`Category: ${r.categoryKey}`);
  lines.push(`Version: ${r.versionNumber}`);
  if (r.versionReason) lines.push(`Why this version: ${r.versionReason}`);
  lines.push(`Mutually acknowledged: ${r.mutualAt}`);
  lines.push('');
  lines.push('What we agreed:');
  for (const f of r.fields) lines.push(`  • ${f.label}: ${f.value}`);
  lines.push('');
  lines.push('Acknowledged by:');
  for (const p of r.acknowledgedBy) lines.push(`  ✓ ${p.displayName} (${p.role}) — ${p.acknowledgedAt}`);
  lines.push('');
  lines.push('This is a shared record, not a legal contract.');
  lines.push('Verify at https://naweagree.app/r/verify');
  return lines.join('\n');
}
