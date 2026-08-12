// Basic offline app-shell cache for מתכנן ציוד לטיולים
const CACHE_NAME = 'trip-gear-cache-v2';
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

  // Never intercept the YouTube embed / third-party APIs - always go to network
  if (req.url.includes('youtube.com') || req.url.includes('firebaseio.com') || req.url.includes('googleapis.com/identitytoolkit') || req.url.includes('firestore.googleapis.com')) {
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
