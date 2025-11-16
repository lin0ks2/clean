/* MOYAMOVA Service Worker — v6 (Safari-friendly) */

const ROOT = new URL('./', self.location).pathname.replace(/\/$/, '');
const CACHE_NAME = 'moyamova-cache-v1.1';

// Минимальный app shell
const APP_SHELL = [
  'index.html',
  'manifest.webmanifest',
  'css/theme.light.css',
  'css/theme.dark.css',
  'css/view.stats.css'
].map(p => `${ROOT}/${p}`);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// ---------- FETCH STRATEGIES ----------

// index.html → network first
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(`${ROOT}/index.html`, copy));
          return resp;
        })
        .catch(() => caches.match(`${ROOT}/index.html`))
    );
    return;
  }

  // STATIC FILES → cache-first (no background updating)
  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).catch(() => cached);
      })
    );
    return;
  }
});

// ---------- Messages ----------
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
