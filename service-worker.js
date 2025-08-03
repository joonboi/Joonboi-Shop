const CACHE_NAME = 'joonboi-plex-cache-v1';
const urlsToCache = [
  '/joonboi-plex-requester/',
  '/joonboi-plex-requester/config.json',
  '/joonboi-plex-requester/style.css',
  '/joonboi-plex-requester/script.js',
  '/joonboi-plex-requester/index.html',
  '/joonboi-plex-requester/manifest.json',
  '/joonboi-plex-requester/icons/icon-192.png',
  '/joonboi-plex-requester/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached resource or fetch from network
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
});
