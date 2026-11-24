'use client';
import { useEffect } from 'react';
import { reloadSafely } from '@/lib/recover';
export default function PWA() {
  useEffect(() => {
    window.__maorOK = 1; // the inline watchdog in layout.js reloads the page when this never gets set (scripts failed to load)
    try { sessionStorage.removeItem('mz'); } catch {} // this load worked: clear the watchdog's failure counter so its back-off starts from 15s again next time
    if (!('serviceWorker' in navigator)) return;
    const disp = location.pathname.indexOf('/display') === 0; // never auto-reload /admin (unsaved edits)
    const had = !!navigator.serviceWorker.controller;
    let iv, tm, dead = false;
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => { if (!dead) iv = setInterval(() => reg.update().catch(() => {}), 3600e3); }).catch(() => {}); // `dead`: register() can resolve after unmount - without the guard that hourly interval would be left running for ever
    // a NEW service worker took over while this TV page was open: reload once (after 20s) to run the new version consistently
    const cc = () => { if (had && disp) tm = setTimeout(() => reloadSafely('sw-activated'), 20e3); };
    navigator.serviceWorker.addEventListener('controllerchange', cc);
    return () => { dead = true; clearInterval(iv); clearTimeout(tm); navigator.serviceWorker.removeEventListener('controllerchange', cc); };
  }, []);
  return null;
}
