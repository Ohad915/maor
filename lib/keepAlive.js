'use client';
import { useEffect, useRef } from 'react';

// 1s black 16x16 silent clips (no audio track): playing them in a loop tells smart-TV browsers that media is active, so the TV does not sleep
const MP4 = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAM3bW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAmF0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAAAAABAAAAAAHZbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAKABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABhG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAURzdGJsAAAAuHN0c2QAAAAAAAAAAQAAAKhhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAABAAEABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAALmF2Y0MBQsAK/+EAFmdCwArZHsBEAAADAAQAAAMAKDxImSABAAVoy4PLIAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAABVIAAAVSAAAABhzdHRzAAAAAAAAAAEAAAAFAAAIAAAAABRzdHNzAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAFAAAAAQAAAChzdHN6AAAAAAAAAAAAAAAFAAACgwAAAAoAAAAKAAAACQAAAAkAAAAUc3RjbwAAAAAAAAABAAADZwAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjAuMTYuMTAwAAAACGZyZWUAAAKxbWRhdAAAAnAGBf//bNxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0wIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDE6MHgxMTEgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTAgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0xIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTI1MCBrZXlpbnRfbWluPTUgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAALZYiEBHyYoAA2I4AAAAAGQZo4CPqAAAAABkGaVAI+oAAAAAVBmmAQ9QAAAAVBmoA/1A==';
const WEBM = 'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAI/EU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEeTbuMU6uEHFO7a1OsggIp7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiECPQAAAAAAAFlSua8GuAQAAAAAAADjXgQFzxYgP0QlQCvcd85yBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhAvrwgDgibCBELqBEJqBAhJUw2f8c3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9ZjwItjxYgP0QlQCvcd82fIoUWjh0VOQ09ERVJEh5RMYXZjNjAuMzEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDEuMDAwMDAwMDAwAB9DtnVAhOeBAKOjgQAAgBACAJ0BKhAAEAAARwiFhYiFhIgCAgAMDWAA/v+rUICjlYEAyACxAQABEBAAGAAYWC/0AAgAAKOVgQGQALEBAAEQEAAYABhYL/QACAAAo5WBAlgAsQEAARAQABgAGFgv9AAIAACjlYEDIACxAQABEBAAGAAYWC/0AAgAABxTu2uRu4+zgQC3iveBAfGCAZ/wgQM=';
const SOFT_RELOAD_MS = 6 * 3600e3; // soft page refresh every 6 hours (frees leaked memory, picks up new versions)
const HEAP_LIMIT = 600 * 1048576; // reload early if the JS heap grows beyond ~600MB (Chromium only)

/** Real TV screen only: Wake Lock (auto re-acquire) + invisible silent video loop + watchdog / soft refresh against browser freezes. */
export default function KeepAlive() {
  const vid = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let alive = true, lock = null, tm = null;
    const safe = (fn) => { try { const r = fn(); if (r && typeof r.catch === 'function') r.catch(() => {}); } catch {} };

    // 1. Screen Wake Lock: request again whenever it is released / the tab becomes visible / focus returns / every minute as a safety net
    const ask = async () => {
      try {
        if (!alive || !navigator.wakeLock || document.visibilityState !== 'visible') return;
        if (lock && !lock.released) return;
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener?.('release', () => { lock = null; if (alive) { clearTimeout(tm); tm = setTimeout(ask, 1000); } });
      } catch { lock = null; }
    };
    ask();
    const onVis = () => { ask(); playVid(); };
    document.addEventListener('visibilitychange', onVis); addEventListener('focus', onVis); addEventListener('pageshow', onVis); addEventListener('online', onVis);

    // 2. fallback for TVs without Wake Lock: hidden muted video looping forever (autoplay may be blocked -> retry every minute and on the first touch / key press)
    const playVid = () => { const v = vid.current; if (!v) return; v.muted = true; if (v.paused) safe(() => v.play()); };
    playVid();
    const once = () => { playVid(); ask(); };
    ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((e) => addEventListener(e, once, { passive: true }));

    // 3. watchdog + small background "interaction" + soft refresh
    const t0 = Date.now(); let last = Date.now();
    const iv = setInterval(() => {
      const n = Date.now();
      ask(); playVid();
      const gap = n - last; last = n;
      const idle = () => navigator.onLine !== false; // never reload while offline (the page might not come back)
      safe(() => dispatchEvent(new Event('mousemove'))); // keeps idle timers of some TV browsers from firing
      if (idle()) {
        if (gap > 5 * 60e3) location.reload(); // the page was frozen/suspended for 5+ minutes: start clean
        else if (n - t0 > SOFT_RELOAD_MS) location.reload();
        else if (performance?.memory?.usedJSHeapSize > HEAP_LIMIT) location.reload();
      }
    }, 60e3);

    return () => {
      alive = false; clearInterval(iv); clearTimeout(tm);
      document.removeEventListener('visibilitychange', onVis); removeEventListener('focus', onVis); removeEventListener('pageshow', onVis); removeEventListener('online', onVis);
      ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((e) => removeEventListener(e, once));
      safe(() => lock?.release());
    };
  }, []);
  return (
    <video ref={vid} muted loop playsInline autoPlay preload="auto" aria-hidden="true" tabIndex={-1} disablePictureInPicture
      style={{ position: 'fixed', width: 1, height: 1, right: 0, bottom: 0, opacity: 0.01, pointerEvents: 'none', zIndex: -1 }}>
      <source src={MP4} type="video/mp4" /><source src={WEBM} type="video/webm" />
    </video>);
}
