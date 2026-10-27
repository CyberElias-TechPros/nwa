'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production builds only (so HMR/next dev
 * stays predictable). When a new SW takes over it prompts the user to
 * reload via a window event — we keep that logic minimal here; a banner
 * component can subscribe to `nwa:sw-updated` if desired.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((r) => {
          if (r.waiting) window.dispatchEvent(new CustomEvent('nwa:sw-updated'));
          r.addEventListener('updatefound', () => {
            const sw = r.installing;
            sw?.addEventListener('statechange', () => {
              if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('nwa:sw-updated'));
              }
            });
          });
        })
        .catch(() => { /* offline or disabled */ });
    });

    // Reload when the new SW claims the client.
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);
  return null;
}
