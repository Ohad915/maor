// Offline-first service worker: the TV display keeps working with no internet (also after a cold start).
//  - /_next/static, /images, /icons, fonts: cache-first (immutable, fast, works offline)
//  - pages & everything else same-origin: network-first with a 3s timeout, then the cached copy (so a "connected but no internet" Wi-Fi never hangs the screen)
//  - Firebase / API traffic is never intercepted (Firestore has its own IndexedDB offline cache)
const V = 'maor-v96', STATIC = 'maor-static', SHELL = ['/', '/display', '/admin', '/login'], FONTS = 'maor-fonts';
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.open(STATIC).then((c) => c.keys().then((ks) => ks.length > 600 ? Promise.all(ks.slice(0, ks.length - 400).map((q) => c.delete(q))) : 0)).catch(() => {}).then(() => caches.keys()).then((k) => Promise.all(k.filter((x) => x !== V && x !== FONTS && x !== STATIC).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
const offlinePage = () => new Response('<!doctype html><meta charset=utf-8><meta http-equiv=refresh content=20><body style="background:#0b1226;color:#fff;font:32px sans-serif;text-align:center;padding-top:20vh">מתחבר מחדש…</body>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); // self-refreshing page: a TV is never left on a dead browser error page
const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
const put = (name, r, res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(name).then((x) => x.put(r, c)).catch(() => {}); } return res; };
// Cache miss chain. caches.match() returns a PROMISE (always truthy), so the fallbacks can only be tried one after the other - with `a || b || c` the
// first match() won the chain and everything behind it was dead code: a navigation with nothing cached answered with `undefined` (= the TV's own
// browser error page) and a sub-resource could be answered with the /display HTML document.
const step = (list, i) => (i >= list.length ? Promise.resolve(null) : caches.match(list[i][0], list[i][1]).catch(() => null).then((m) => m || step(list, i + 1)));
const fallback = (r, u, nav) => step(nav ? [[r, { ignoreSearch: true }], [u.pathname], ['/display'], ['/']] : [[r]], 0)
  .then((m) => m || (nav ? offlinePage() : Response.error()));
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin !== location.origin) { // Google Fonts: keep a copy so the typography survives offline
    if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(caches.open(FONTS).then((c) => c.match(r).then((m) => m || fetch(r).then((res) => put(FONTS, r, res)).catch(() => m))));
    return;
  }
  if (u.pathname.startsWith('/api/')) return;
  if (/^\/_next\/static\//.test(u.pathname)) { // hashed chunks: cache-first in a cache that SURVIVES releases, so an already-open page never loses its old chunks
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => put(STATIC, r, res))));
    return;
  }
  if (/^\/(images|icons)\//.test(u.pathname)) { // cache-first
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => put(V, r, res))));
    return;
  }
  const nav = r.mode === 'navigate';
  e.respondWith(withTimeout(fetch(r), nav ? 3500 : 6000).then((res) => put(V, r, res)).catch(() => fallback(r, u, nav)));
});
