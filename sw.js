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

// Inside your Service Worker event listener intercept loop:
self.addEventListener('fetch', (event) => {
  // Only intercept page navigation requests if we want to serve a hard offline page.
  // 🌟 FIX: For a data-cached PWA app shell, we should always return the cached index.html shell instead!
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html'); // Serves the Vue engine layout shell offline!
      })
    );
    return;
  }

  // Standard static asset/image caching strategies...
});