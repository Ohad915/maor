'use client';
import { useEffect, useState } from 'react';
import { SCREENS, SCREEN_NAMES } from '@/lib/types';

/** Pop-up showing the live TV screen (/display) exactly as it appears in the synagogue. */
export default function PreviewModal({ sid, onClose }) {
  const [screen, setScreen] = useState(SCREENS[0]), [vp, setVp] = useState({ w: 1000, h: 700 });
  useEffect(() => { const u = () => setVp({ w: innerWidth, h: innerHeight }); u(); addEventListener('resize', u); return () => removeEventListener('resize', u); }, []);
  const k = Math.min(1, (vp.w - 20) / 1280, (vp.h - 120) / 720);
  return (
    <div className="pv" onClick={onClose}>
      <div className="row" style={{ flex: '0 0 auto', width: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <select value={screen} onChange={(e) => setScreen(e.target.value)}>{SCREENS.map((s) => <option key={s} value={s}>{SCREEN_NAMES[s]}</option>)}</select>
        <button className="b" onClick={onClose}>סגור תצוגה מקדימה</button>
      </div>
      <div className="pvx" style={{ width: 1280 * k, height: 720 * k, background: '#000' }} onClick={(e) => e.stopPropagation()}>
        <iframe title="live-preview" src={`/display?s=${sid}&screen=${screen}`} style={{ transform: `scale(${k})` }} />
      </div>
    </div>);
}
