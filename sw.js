// Basic offline app-shell cache for מתכנן ציוד לטיולים
//
// Strategy:
// - App shell (the HTML page + manifest): network-first. Always try to fetch the
//   latest deploy when online; only fall back to the cached copy when offline.
//   This is what makes new deployments show up without users needing to manually
//   clear their cache.
// - /api/* : never touched by the service worker at all - trip data must always
//   come straight from the network, never from a stale cached response.
// - Static assets (icons, background images): cache-first, since they rarely
//   change and this keeps the app fast / usable offline.
const CACHE_NAME = 'trip-gear-cache-v4';
const APP_SHELL = [
  './trip-gear-planner.html',
  './manifest.json',
  './assets/bg-onboarding-hills.jpg',
  './assets/bg-home-forest.jpg',
  './assets/bg-home-light-opt.jpg',
  './assets/icon-192-v2.png',
  './assets/icon-512-v2.png',
  './assets/apple-touch-icon-v2.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept third-party embeds - always go straight to network
  if (url.hostname.includes('youtube.com')) return;

  // Never cache API calls - trip data (shared trips, packed state, polling) must
  // always be live, never a stale cached response.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  const isAppShellDoc = req.mode === 'navigate' || url.pathname.endsWith('/manifest.json');

  if (isAppShellDoc) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./trip-gear-planner.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
