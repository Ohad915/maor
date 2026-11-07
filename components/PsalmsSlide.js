'use client';
import { useLayoutEffect, useRef } from 'react';
import { gem } from '@/lib/hebrew';

/** One page of the daily-psalm slide: gold title with the chapter (Hebrew letters), optional dedication, vowelled text. Used full-screen in Display and as the live preview in the admin. */
export default function PsalmsFullscreenSlide({ page, dedication, dots, source = true, unit = 'cqh', scale = 1 }) {
  const box = useRef(null), pr = useRef(null);
  const key = page ? page.title + (page.range || '') + (dedication || '') + page.v.reduce((n, [, t]) => n + t.length, 0) : '';
  // auto-fit: shrink the text until the whole page is visible inside the card (never cut)
  useLayoutEffect(() => {
    const b = box.current, p = pr.current; if (!b || !p) return;
    const run = () => { p.style.fontSize = p.dataset.f; let n = 0; while (b.scrollHeight > b.clientHeight + 1 && n++ < 24) p.style.fontSize = (parseFloat(p.style.fontSize) * 0.95).toFixed(3) + p.dataset.u; };
    run(); try { document.fonts?.ready?.then(run); } catch {}
    addEventListener('resize', run); return () => removeEventListener('resize', run);
  }, [key, unit, scale]); // eslint-disable-line
  if (!page) return null;
  const L = page.v.reduce((n, [, t]) => n + t.replace(/[֑-ׇ]/g, '').length, 0);
  const f = 4.4.toFixed(2); // font size in cqh by amount of text
  return (
    <div className="dhf psf" dir="rtl" ref={box}>
      <em>✦ תהילים ✦</em>
      <h3>{page.title}{page.range && <small className="psr"> · {page.range}</small>}</h3>
      {dedication && dedication.trim() && <div className="psd">{dedication.trim()}</div>}
      <p ref={pr} data-f={(f * scale).toFixed(2) + unit} data-u={unit} style={{ fontSize: (f * scale).toFixed(2) + unit }}>{page.v.map(([n, t], i) => <span key={i}>{n > 0 && <sup>{gem(n).replace(/[׳״]/g, '')}</sup>}{t}{' '}</span>)}</p>
      {source && <small>{dots}</small>}
    </div>);
}
