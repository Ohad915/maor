'use client';
import { useEffect, useRef, useState } from 'react';
import { SCREENS, SCREEN_NAMES } from '@/lib/types';
import Display from '@/components/Display';
import ErrorBoundary from '@/components/ErrorBoundary';

/** Live preview that sits inside the admin page (no pop-up), scaled to the available width. Mounted only while open. */
export default function InlinePreview({ sid }) {
  const [screen, setScreen] = useState(SCREENS[0]), [w, setW] = useState(320), box = useRef(null);
  useEffect(() => {
    const u = () => box.current && setW(box.current.clientWidth); u();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(u) : null; ro?.observe(box.current);
    return () => ro?.disconnect();
  }, []);
  const k = w / 1280;
  return (<div ref={box}>
    <div className="row"><select value={screen} onChange={(e) => setScreen(e.target.value)}>{SCREENS.map((s) => <option key={s} value={s}>{SCREEN_NAMES[s]}</option>)}</select></div>
    <div style={{ width: w, height: 720 * k, background: '#000', overflow: 'hidden', borderRadius: 8, marginTop: 8 }}>
      <div style={{ width: 1280, height: 720, transform: `scale(${k})`, transformOrigin: '0 0' }}>
        <ErrorBoundary key={screen}><Display sid={sid} screenId={screen} fixedSize={{ w: 1280, h: 720 }} preview /></ErrorBoundary>
      </div>
    </div>
  </div>);
}
