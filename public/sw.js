// Minimal service worker to pass PWA installation criteria
const CACHE_NAME = 'kidsaccount-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Let network requests go through normally so our Google Sheets API stays real-time
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});