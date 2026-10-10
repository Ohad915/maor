// Network-first service worker: the app shell (incl. /display) stays available when the network is gone.
const V = 'maor-v2', SHELL = ['/', '/display', '/admin', '/login'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // Firebase traffic is never intercepted
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((x) => x.put(r, c)); } return res; })
    .catch(() => caches.match(r, r.mode === 'navigate' ? { ignoreSearch: true } : undefined).then((m) => m || (r.mode === 'navigate' ? caches.match(u.pathname) : null) || caches.match('/'))));
});
