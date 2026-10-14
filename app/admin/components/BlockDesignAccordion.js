'use client';
import { useState } from 'react';
import { BLOCKS, isRoyal } from '@/lib/types';
import { DebIn, FontSel, Range } from './UI';

/** Per-block settings that also own legacy cf.* keys (font / slide time). */
const CF_OF = { pr: ['pr'], mn: ['ann', 'hal'], yz: ['mem'], rf: ['rf'] };
const CAROUSEL = new Set(['mn', 'yz', 'rf']); // blocks that rotate content -> have a slide time
const ROYAL_BLOCKS = [['hd', 'סרגל עליון (תאריך וזמני תפילות)'], ['pr', 'פרשת השבוע והפטרה'], ['mn', 'הודעות והלכה (פאנל מרכזי)'], ['yz', 'לעילוי נשמת'], ['rf', 'רפואה שלמה'], ['bt', 'סרגל תחתון (זמני היום)']];

/** ONE place for all per-block design: global defaults on top, one collapsible accordion with size, typography, colours and slide time per block. */
export default function BlockDesignAccordion({ st, set, sid, royal: royalProp }) {
  const royal = royalProp ?? isRoyal(st);
  const [openAll, setOpenAll] = useState(false), [open, setOpen] = useState({});
  const blocks = st.blocks || {}, g = { font: 'david', secs: 10, ...(st.cf || {}).all }, fsAll = st.fsAll ?? 18;
  const list = royal ? [...ROYAL_BLOCKS.slice(0, 5), ...(String(st.layout) === '4' ? [['qr', 'תרומות והקדשות (QR)']] : []), ROYAL_BLOCKS[5]] : BLOCKS;
  const reset = (k) => { set(`blocks.${k}`, {}); (CF_OF[k] || []).forEach((c) => set(`cf.${c}`, {})); };
  const touched = (k) => { const b0 = blocks[k] || {}, b = royal ? (b0['L' + String(st.layout || '1')] || {}) : b0; return b.w != null && b.w !== 50 || b.h != null && b.h !== 50 || b0.fs != null || b0.font || b0.secs || (!royal && (b0.bg || b0.bd)) || b0.tx || (CF_OF[k] || []).some((c) => (st.cf || {})[c]?.font || (st.cf || {})[c]?.secs); };
  return (
    <div className="cd">
      <b>עיצוב הלוח: ברירות מחדל והתאמה לפי קובייה</b>
      <label>גופן ראשי ללוח (חל על כל הקוביות)</label>
      <div className="row"><FontSel value={g.font} onChange={(v) => set('cf.all.font', v)} /></div>
      <Range label={`גודל טקסט ברירת מחדל: ${fsAll}`} min={12} max={50} value={fsAll} onChange={(v) => set('fsAll', v)} />
      <Range label="זמן שקופית כללי (שניות)" min={1} max={30} value={g.secs} onChange={(v) => set('cf.all.secs', v)} />
      <button type="button" className={`accb ${openAll ? 'o' : ''}`} onClick={() => setOpenAll(!openAll)}><span>התאמה אישית לפי קובייה (רשות){list.some(([k]) => touched(k)) && ' ●'}</span><span>{openAll ? '▲' : '▼'}</span></button>
      {openAll && <div className="accbody">
        <div style={{ color: 'var(--mu)', fontSize: 13 }}>50% = אוטומטי. כל התאמה כאן גוברת על ההגדרות הכלליות של אותה קובייה בלבד.{royal ? ' במצב מקדש ומלכות הרקע והמסגרת קבועים (קלף וזהב).' : ''}</div>
        {list.map(([k, label]) => {
          const b = blocks[k] || {}, cfo = (CF_OF[k] || []).map((c) => (st.cf || {})[c] || {}).find((o) => o.font || o.secs) || {};
          const lk = 'L' + String(st.layout || '1'), lb = royal ? (b[lk] || {}) : b, w = lb.w ?? 50, h = lb.h ?? 50, fs = b.fs ?? fsAll, font = b.font || cfo.font || g.font, secs = b.secs || cfo.secs || g.secs, o = open[k];
          const col = (f, l) => (
            <div className="row"><label style={{ flex: '1 1 110px' }}>{l}</label>
              <DebIn type="color" style={{ flex: '0 0 60px', padding: 2 }} value={b[f] || '#888888'} onChange={(x) => set(`blocks.${k}.${f}`, x)} />
              <button className="b g" style={{ flex: '0 0 auto', padding: '6px 10px' }} onClick={() => set(`blocks.${k}.${f}`, '')}>{b[f] ? 'חזור לנושא' : 'צבע הנושא'}</button></div>);
          return (
            <div key={k}>
              <button className={`accb ${o ? 'o' : ''}`} onClick={() => setOpen({ ...open, [k]: !o })}><span>{label}{touched(k) && ' ●'}</span><span>{o ? '▲' : '▼'}</span></button>
              {o && <div className="accbody">
                <b style={{ fontSize: 13 }}>מידות</b>
                {k !== 'bt' && <>
                  <label>רוחב: {w === 50 ? 'Auto (50%)' : w + '%'}</label><DebIn type="range" min="10" max="100" value={w} onChange={(x) => set(royal ? `blocks.${k}.${lk}.w` : `blocks.${k}.w`, x)} />
                  <label>גובה: {h === 50 ? 'Auto (50%)' : h + '%'}</label><DebIn type="range" min="10" max="100" value={h} onChange={(x) => set(royal ? `blocks.${k}.${lk}.h` : `blocks.${k}.h`, x)} />
                </>}
                <b style={{ fontSize: 13 }}>טיפוגרפיה</b>
                <label>גודל טקסט: {fs}</label><DebIn type="range" min="12" max="50" value={fs} onChange={(x) => set(`blocks.${k}.fs`, x)} />
                {CF_OF[k] && <><label>גופן ייעודי</label><div className="row"><FontSel value={font} onChange={(v) => set(`blocks.${k}.font`, v)} /></div></>}
                <b style={{ fontSize: 13 }}>צבעים</b>
                {!royal && col('bg', 'צבע רקע')}{!royal && col('bd', 'צבע מסגרת')}{col('tx', 'צבע טקסט')}
                {CAROUSEL.has(k) && <><b style={{ fontSize: 13 }}>זמן שקופית</b><Range label={`זמן תצוגה (שניות)${b.secs || cfo.secs ? '' : ' · כללי'}`} min={1} max={30} value={secs} onChange={(x) => set(`blocks.${k}.secs`, x)} /></>}
                <button className="b g" onClick={() => reset(k)}>חזור להגדרה הכללית</button>
              </div>}
            </div>);
        })}
        <button className="b g" style={{ marginTop: 10 }} onClick={() => list.forEach(([k]) => reset(k))}>איפוס כל הקוביות</button>
      </div>}
    </div>);
}
