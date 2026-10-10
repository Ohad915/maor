'use client';
import { useEffect, useState } from 'react';
import { SCREENS, SCREEN_NAMES } from '@/lib/types';
import Display from '@/components/Display';

/** Live pop-up of the TV screen. Renders the same Display component directly (no iframe), scaled to fit. */
export default function PreviewModal({ sid, onClose }) {
  const [screen, setScreen] = useState(SCREENS[0]), [vp, setVp] = useState({ w: 1000, h: 700 });
  useEffect(() => { const u = () => setVp({ w: innerWidth, h: innerHeight }); u(); addEventListener('resize', u); return () => removeEventListener('resize', u); }, []);
  const k = Math.min(1, (vp.w - 20) / 1280, (vp.h - 120) / 720);
  return (
    <div className="pv" onClick={onClose}>
      <div className="row" style={{ flex: '0 0 auto', width: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <select value={screen} onChange={(e) => setScreen(e.target.value)}>{SCREENS.map((s) => <option key={s} value={s}>{SCREEN_NAMES[s]}</option>)}</select>
        <a className="b g" style={{ textDecoration: 'none' }} href={`/display?s=${sid}&screen=${screen}`} target="_blank" rel="noreferrer">פתח בטאב חדש</a>
        <button className="b" onClick={onClose}>סגור תצוגה מקדימה</button>
      </div>
      <div className="pvx" style={{ width: 1280 * k, height: 720 * k, background: '#000' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 1280, height: 720, transform: `scale(${k})`, transformOrigin: '0 0' }}>
          <Display key={screen} sid={sid} screenId={screen} fixedSize={{ w: 1280, h: 720 }} preview />
        </div>
      </div>
    </div>);
}
