'use client';
import { useState } from 'react';
import { BLOCKS } from '@/lib/types';

/** One accordion row per block: width/height (50% = Auto), background/border/text colour overrides. */
export default function BlockDesignAccordion({ st, set, sid }) {
  const [open, setOpen] = useState({});
  const blocks = st.blocks || {};
  const reset = (k) => set(`blocks.${k}`, {});
  return (
    <div className="cd">
      <b>גודל וצבע הקוביות</b>
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>50% = Auto. מתחת ל-50% הקובייה קטנה מהאוטומטי, מעליו גדולה ממנו. צבע ייעודי פעיל רק אם שונה במפורש.</div>
      {BLOCKS.map(([k, label]) => {
        const b = blocks[k] || {}, w = b.w ?? 50, h = b.h ?? 50, fs = b.fs ?? 18, o = open[k];
        const col = (f, l) => (
          <div className="row"><label style={{ flex: '1 1 110px' }}>{l}</label>
            <input type="color" style={{ flex: '0 0 60px', padding: 2 }} value={b[f] || '#888888'} onChange={(e) => set(`blocks.${k}.${f}`, e.target.value)} />
            <button className="b g" style={{ flex: '0 0 auto', padding: '6px 10px' }} onClick={() => set(`blocks.${k}.${f}`, '')}>{b[f] ? 'חזור לנושא' : 'צבע הנושא'}</button></div>);
        return (
          <div key={k}>
            <button className={`accb ${o ? 'o' : ''}`} onClick={() => setOpen({ ...open, [k]: !o })}>
              <span>{label}{(w !== 50 || h !== 50 || fs !== 18 || b.bg || b.bd || b.tx) && ' ●'}</span><span>{o ? '▲' : '▼'}</span></button>
            {o && (
              <div className="accbody">
                <label>רוחב: {w === 50 ? 'Auto (50%)' : w + '%'}</label><input type="range" min="10" max="100" value={w} onChange={(e) => set(`blocks.${k}.w`, +e.target.value)} />
                <label>גובה: {h === 50 ? 'Auto (50%)' : h + '%'}</label><input type="range" min="10" max="100" value={h} onChange={(e) => set(`blocks.${k}.h`, +e.target.value)} />
                <button className="b g" onClick={() => { set(`blocks.${k}.w`, 50); set(`blocks.${k}.h`, 50); }}>חזור ל-Auto (50%)</button>
                <label>גודל טקסט בקובייה: {fs === 18 ? 'Auto (18)' : fs}</label><input type="range" min="12" max="30" value={fs} onChange={(e) => set(`blocks.${k}.fs`, +e.target.value)} />
                <button className="b g" onClick={() => set(`blocks.${k}.fs`, 18)}>גודל טקסט: חזור לברירת מחדל</button>
                {col('bg', 'צבע רקע')}{col('bd', 'צבע מסגרת')}{col('tx', 'צבע טקסט')}
              </div>)}
          </div>);
      })}
      <button className="b g" style={{ marginTop: 10 }} onClick={() => BLOCKS.forEach(([k]) => reset(k))}>איפוס כל הקוביות</button>
    </div>);
}
