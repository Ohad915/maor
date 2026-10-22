// Offline-first service worker: the TV display keeps working with no internet (also after a cold start).
//  - /_next/static, /images, /icons, fonts: cache-first (immutable, fast, works offline)
//  - pages & everything else same-origin: network-first with a 3s timeout, then the cached copy (so a "connected but no internet" Wi-Fi never hangs the screen)
//  - Firebase / API traffic is never intercepted (Firestore has its own IndexedDB offline cache)
const V = 'maor-v66', SHELL = ['/', '/display', '/admin', '/login'], FONTS = 'maor-fonts';
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V && x !== FONTS).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
const put = (name, r, res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(name).then((x) => x.put(r, c)).catch(() => {}); } return res; };
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin !== location.origin) { // Google Fonts: keep a copy so the typography survives offline
    if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(caches.open(FONTS).then((c) => c.match(r).then((m) => m || fetch(r).then((res) => put(FONTS, r, res)).catch(() => m))));
    return;
  }
  if (u.pathname.startsWith('/api/')) return;
  if (/^\/(_next\/static|images|icons)\//.test(u.pathname)) { // cache-first
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => put(V, r, res))));
    return;
  }
  const nav = r.mode === 'navigate';
  e.respondWith(withTimeout(fetch(r), nav ? 3500 : 6000).then((res) => put(V, r, res))
    .catch(() => caches.match(r, nav ? { ignoreSearch: true } : undefined).then((m) => m || (nav ? caches.match(u.pathname) : null) || caches.match('/display') || caches.match('/'))));
});
