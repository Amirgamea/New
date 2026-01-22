const CACHE_NAME = 'bear-docx-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-180.png',
  '/icon-192.png', 
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Network first for API, Cache first for static
  if (event.request.method === 'POST') {
    return; // Don't cache POST requests
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});