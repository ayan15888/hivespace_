// HiveSpace Service Worker
// Satisfies PWA installation criteria without local file caching to prevent dev/prod HMR issues.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let Next.js, WebSockets (STOMP), and hot-reloading traffic pass through naturally
  event.respondWith(fetch(event.request));
});
