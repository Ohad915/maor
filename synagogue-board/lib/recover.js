'use client';
import { useEffect } from 'react';

const KEY = 'maor-reloads';
/**
 * Reload the page, but never in a tight loop: at most 3 reloads per 5 minutes (then we wait), and only when the server is really reachable
 * (an offline reload could land on a browser error page). Fire-and-forget.
 */
export function reloadSafely(reason = '') {
  try {
    if (typeof window === 'undefined' || reloading) return false;
    reloading = true;
    // navigator.onLine lies on many TV browsers: probe a real, uncached endpoint first; only a reachable server counts as an attempt
    let done = false;
    const fail = () => { if (!done) { done = true; reloading = false; } };
    const t = setTimeout(fail, 7000);
    fetch('/api/version?t=' + Date.now(), { cache: 'no-store' }).then((r) => {
      clearTimeout(t); if (done) return;
      if (!r.ok) return fail();
      const now = Date.now(); let list = [];
      try { list = JSON.parse(sessionStorage.getItem(KEY) || '[]').filter((x) => now - x < 5 * 60e3); } catch {}
      if (list.length >= 3) return fail();
      try { list.push(now); sessionStorage.setItem(KEY, JSON.stringify(list)); } catch {}
      done = true; console.warn('[maor] reload:', reason);
      try { location.reload(); } catch {}
      setTimeout(() => { try { location.replace(location.pathname + location.search); } catch {} }, 10e3); // reload() is a no-op on some TV firmware
      setTimeout(() => { reloading = false; }, 30e3);
    }, () => { clearTimeout(t); fail(); });
    return true;
  } catch { reloading = false; return false; }
}
let reloading = false;

const CHUNK = /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed|Unexpected token '<'|Failed to fetch dynamically/i;
const VERSION_POLL_MS = 3 * 60e3;

/**
 * TV self-healing, mounted OUTSIDE the error boundary so it keeps running while the fallback is on screen:
 *  - a stale-deployment error (missing chunk after a new deploy) or any uncaught error storm -> reload
 *  - polls /api/version every 3 minutes; a newer deployment -> reload (no more Ctrl+Shift+R after a release)
 */
export default function Recover() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let errs = [];
    const onErr = (msg) => {
      const m = String(msg || '');
      if (CHUNK.test(m)) { reloadSafely('stale chunk: ' + m.slice(0, 80)); return; }
      const n = Date.now(); errs = errs.filter((t) => n - t < 60e3); errs.push(n);
      if (errs.length >= 8) { errs = []; reloadSafely('error storm'); }
    };
    const e1 = (e) => onErr(e?.message || e?.error?.message);
    const e2 = (e) => onErr(e?.reason?.message || e?.reason);
    addEventListener('error', e1); addEventListener('unhandledrejection', e2);

    const mine = process.env.NEXT_PUBLIC_BUILD_ID || '';
    const check = async () => {
      if (!mine || navigator.onLine === false) return;
      try {
        const r = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (j?.b && j.b !== mine) reloadSafely('new version ' + j.b);
      } catch {}
    };
    const iv = setInterval(check, VERSION_POLL_MS);
    const t0 = setTimeout(check, 20e3);
    addEventListener('online', check);
    return () => { removeEventListener('error', e1); removeEventListener('unhandledrejection', e2); removeEventListener('online', check); clearInterval(iv); clearTimeout(t0); };
  }, []);
  return null;
}
