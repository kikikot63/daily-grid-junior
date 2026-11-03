const CACHE_NAME = 'daily-grid-offline-v2';
const ASSETS = [
  './index.html', './style.css?v=10', './fonts.css', './app.js?v=9', './pwa.js?v=2',
  './puzzles.json?v=9', './pencil.svg', './book.svg', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './font-0.ttf', './font-1.ttf', './font-2.ttf', './font-3.ttf',
  './font-4.ttf', './font-5.ttf', './font-6.ttf'
];
const assetURLs = ASSETS.map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // The whole game must be saved before this worker can report offline readiness.
    await cache.addAll(assetURLs.map(url => new Request(url, {cache:'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('daily-grid-offline-') && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode === 'navigate') {
      const page = await cache.match(new URL('./index.html', self.registration.scope).href);
      if (page) return page;
    }
    const stored = await cache.match(request);
    return stored || fetch(request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'OFFLINE_STATUS' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const complete = (await Promise.all(assetURLs.map(url => cache.match(url)))).every(Boolean);
    event.ports[0].postMessage({ready:complete,version:CACHE_NAME});
  })());
});
