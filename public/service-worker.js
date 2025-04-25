const CACHE_NAME = 'sarihub-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  '/images/icons/icon-192.png',
  '/images/icons/icon-512.png',
  // Add your images you want cached:
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
