'use client';
import { useEffect } from 'react';
import { reloadSafely } from '@/lib/recover';
export default function PWA() {
  useEffect(() => {
    window.__maorOK = 1; // the inline watchdog in layout.js reloads the page when this never gets set (scripts failed to load)
    if (!('serviceWorker' in navigator)) return;
    const disp = location.pathname.indexOf('/display') === 0; // never auto-reload /admin (unsaved edits)
    const had = !!navigator.serviceWorker.controller;
    let iv;
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => { iv = setInterval(() => reg.update().catch(() => {}), 3600e3); }).catch(() => {});
    // a NEW service worker took over while this TV page was open: reload once (after 20s) to run the new version consistently
    const cc = () => { if (had && disp) setTimeout(() => reloadSafely('sw-activated'), 20e3); };
    navigator.serviceWorker.addEventListener('controllerchange', cc);
    return () => { clearInterval(iv); navigator.serviceWorker.removeEventListener('controllerchange', cc); };
  }, []);
  return null;
}
