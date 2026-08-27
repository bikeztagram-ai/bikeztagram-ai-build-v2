const BIKEZTAGRAM_CACHE_VERSION = CACHE_NAME;
const CACHE_NAME = 'bikeztagram-shell-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key.startsWith('bikeztagram-shell-')).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API calls, generated media or FFmpeg assets. The shell is the
  // only offline surface; runtime assets remain network-first to avoid stale builds.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ffmpeg/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(BIKEZTAGRAM_NAVIGATION_FALLBACK)));
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

const BIKEZTAGRAM_NAVIGATION_FALLBACK = '/index.html';
