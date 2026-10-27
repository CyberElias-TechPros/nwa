#!/usr/bin/env node
/**
 * End-to-end smoke against the running BFF (next dev on port 3000).
 *
 * Exercises: create → fetch invite → claim → ack → fetch receipt → verify
 * plus static routes, health proxy, manifest, outbox meta.
 *
 * Exits non-zero on first failure.
 */
import { spawn } from 'node:child_process';

const base = process.env.SMOKE_BASE ?? 'http://127.0.0.1:3000';
const cookieJar = new Map();
let step = 0;

function parseCookies(setCookies) {
  if (!setCookies) return;
  for (const raw of setCookies) {
    const [kv] = raw.split(';');
    const [name, ...rest] = kv.split('=');
    cookieJar.set(name.trim(), rest.join('='));
  }
}
function cookieHeader() {
  return Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function j(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookieJar.size ? { cookie: cookieHeader() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  parseCookies(res.headers.getSetCookie?.() ?? []);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { res, data };
}

async function ok(method, path, body) {
  const tag = `[${++step}] ${method} ${path}`;
  const start = Date.now();
  const { res, data } = await j(method, path, body);
  const ms = Date.now() - start;
  if (!res.ok) {
    console.error(`${tag} → ${res.status} (${ms}ms)`, data);
    process.exit(1);
  }
  console.log(`${tag} → ${res.status} (${ms}ms)`);
  return { res, data };
}

async function expectStatus(method, path, expected, body) {
  const tag = `[${++step}] ${method} ${path} (expect ${expected})`;
  const { res } = await j(method, path, body);
  if (res.status !== expected) {
    console.error(`${tag} → got ${res.status}`);
    process.exit(1);
  }
  console.log(`${tag} → ${res.status}`);
}

// 1. Static routes / SEO
{
  const staticPaths = ['/', '/new', '/plans', '/how', '/about', '/principles', '/privacy', '/terms',
    '/safety', '/safety/report', '/privacy/requests', '/r/verify', '/offline',
    '/manifest.webmanifest', '/robots.txt', '/sitemap.xml', '/.well-known/assetlinks.json', '/icon.svg'];
  for (const p of staticPaths) {
    await ok('GET', p);
  }
}

// 2. BFF health proxy
const { data: ready } = await ok('GET', '/api/proxy/v1/ready');
if (ready.status !== 'ready') { console.error('ready not ready', ready); process.exit(1); }
const { data: health } = await ok('GET', '/api/proxy/v1/health');
if (health.status !== 'ok') { console.error('health not ok', health); process.exit(1); }

// 3. Create a plan
const { data: created } = await ok('POST', '/api/proxy/v1/jobs', {
  title: `Smoke ${new Date().toISOString()}`,
  creatorName: 'Smoke Tester',
  categoryKey: 'service',
  initialNotes: 'BFF smoke test.',
});
const inviteToken = created.invite.token;
const jobId = created.job.id;
const creatorParticipantId = created.creatorParticipantId;

// 4. GET /j/[token] HTML page
await ok('GET', `/j/${inviteToken}`);

// 5. Fetch invite preview
const { data: preview } = await ok('GET', `/api/proxy/v1/invites/${inviteToken}`);
if (preview.job.id !== jobId) { console.error('preview job id mismatch'); process.exit(1); }

// 6. Claim as second participant (separate cookie jar — skip cookie jar reuse)
// We use a separate context for the second participant by clearing cookies.
const jar1 = new Map(cookieJar);
cookieJar.clear();
const { data: claim } = await ok('POST', `/api/proxy/v1/invites/${inviteToken}/claim`, { displayName: 'Other party' });
const otherParticipantId = claim.participantId;

// 7. Ack from other party (agree)
await ok('POST', `/api/proxy/v1/invites/${inviteToken}/ack`, {
  participantId: otherParticipantId, action: 'reviewed', comment: 'Looks good.',
});

// 8. Switch back to creator and ack (agree → mutual)
cookieJar.clear();
for (const [k, v] of jar1) cookieJar.set(k, v);
await ok('POST', `/api/proxy/v1/invites/${inviteToken}/ack`, {
  participantId: creatorParticipantId, action: 'reviewed',
});

  // 9. Fetch receipt
const { data: receipt } = await ok('GET', `/api/proxy/v1/jobs/${jobId}/receipt`);
if (receipt.jobId !== jobId) { console.error('receipt job mismatch', receipt); process.exit(1); }
if (!receipt.sig?.value) { console.error('receipt missing signature'); process.exit(1); }
if (receipt.acknowledgedBy?.length !== 2) { console.error('expected 2 acks', receipt.acknowledgedBy); process.exit(1); }

// 10. Verify receipt (POSTs envelope back)
const { data: ver } = await ok('POST', '/api/proxy/v1/receipts/verify', receipt);
if (!ver.ok) { console.error('verify failed', ver); process.exit(1); }

// 11. Abuse report (anonymous)
cookieJar.clear();
const { data: rep } = await ok('POST', '/api/proxy/v1/abuse/report', {
  reason: 'other', description: 'Smoke test report (automated, safe to ignore).',
});
if (!rep.id) { console.error('abuse missing id'); process.exit(1); }

// 12. Privacy request
cookieJar.clear();
const { data: pr } = await ok('POST', '/api/proxy/v1/privacy/requests', { kind: 'export' });
if (!pr.request?.id) { console.error('privacy missing id'); process.exit(1); }

// 13. Bad path returns 404
await expectStatus('GET', '/api/proxy/v1/nope', 404);

// 14. Validation failure returns 400
await expectStatus('POST', '/api/proxy/v1/jobs', 400, { title: '' });

console.log(`\n✅ BFF smoke passed (${step} steps) against ${base}`);
