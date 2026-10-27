/* NaWeAgree service worker — stale-while-revalidate for assets, network-first for navigations.
 * POST/PUT/DELETE are never intercepted: mutations are the outbox's job (see src/lib/outbox.ts).
 * Version bump the cache name to force a refresh; old caches are deleted on activate. */

const CACHE = 'nwa-shell-v2';
const RUNTIME = 'nwa-runtime-v2';
const SHELL = [
  '/', '/offline',
  '/new', '/plans', '/how', '/about', '/principles',
  '/privacy', '/terms', '/safety', '/safety/report',
  '/privacy/requests', '/r/verify',
  '/manifest.webmanifest', '/icon.svg', '/og.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isNavigation(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // mutations handled by outbox
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Don't cache API responses — BFF always goes to network; offline reads
  // return null (UI shows "connect to view" state).
  if (url.pathname.startsWith('/api/proxy/')) return;

  // HTML navigations: network-first, fallback to cached shell, then /offline.
  if (isNavigation(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('/')).then((r) => r || caches.match('/offline')),
        ),
    );
    return;
  }

  // Static assets / public files: stale-while-revalidate.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/public/') ||
    /\.(?:svg|png|ico|webp|jpg|jpeg|gif|css|js|woff2?|json|webmanifest|txt|xml)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      }),
    );
  }
});

// Allow pages to trigger immediate activation after an update.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
