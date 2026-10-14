'use client';
import { useEffect, useRef, useState } from 'react';
import { MONTHS, gem } from '@/lib/hebrew';
import { FONT_LABELS, SCREEN_NAMES } from '@/lib/types';

/** fold: collapsed by default (an accordion) so long forms do not make the phone screen endless. */
export const Card = ({ title, children, className = '', fold, open }) => fold
  ? <details className={`cd fold ${className}`} open={open}><summary>{title}</summary>{children}</details>
  : <div className={`cd ${className}`}>{title && <b>{title}</b>}{children}</div>;
/** Slider / colour input with debounce: the screen follows live, but Firestore gets ONE write ~400ms after the last change. */
export function DebIn({ value, onChange, delay = 400, ...p }) {
  const [v, setV] = useState(value), t = useRef(null), last = useRef(value);
  useEffect(() => { if (value !== last.current) { last.current = value; setV(value); } }, [value]);
  useEffect(() => () => clearTimeout(t.current), []);
  const push = (x) => { clearTimeout(t.current); t.current = setTimeout(() => { last.current = x; onChange(x); }, delay); };
  return <input {...p} value={v} onChange={(e) => { const x = p.type === 'range' ? +e.target.value : e.target.value; setV(x); push(x); }} />;
}
/** Text input that saves on blur (one Firestore write, not one per keystroke). */
export const TextIn = ({ value, onSave, area, ...p }) => {
  const C = area ? 'textarea' : 'input';
  const t = useRef(), mine = useRef(null), cur = useRef(null);
  const flush = (x) => { clearTimeout(t.current); if (x !== (value ?? '') && x !== mine.current) { mine.current = x; onSave(x); } };
  // remount only on external changes (not on our own saves), so typing never loses focus
  const ver = useRef(0), prev = useRef(value);
  if (value !== prev.current) { if (value !== mine.current) ver.current++; prev.current = value; }
  const key = ver.current;
  return <C key={key} defaultValue={value ?? ''}
    onChange={(e) => { const x = e.target.value; cur.current = x; clearTimeout(t.current); t.current = setTimeout(() => flush(x), 700); }}
    onBlur={(e) => flush(e.target.value)}
    onKeyDown={(e) => { if (!area && e.key === 'Enter') flush(e.target.value); }} {...p} />;
};
export const Switch = ({ on, onChange, label }) => (
  <div className="row"><b style={{ flex: '3 1 160px', fontWeight: 500 }}>{label}</b>
    <label className="sw"><input type="checkbox" checked={!!on} onChange={(e) => onChange(e.target.checked)} /><i /></label></div>);
export const Range = ({ label, min, max, value, onChange }) => (
  <><label>{label}: {value}</label><DebIn type="range" min={min} max={max} value={value} onChange={onChange} /></>);
export const Lock = ({ title }) => (
  <div className="cd" style={{ borderStyle: 'dashed' }}><b>🔒 {title}</b><div style={{ color: 'var(--mu)', fontSize: 13 }}>זמין בחבילת PRO / פרימיום</div><button className="b" disabled>שדרג עכשיו</button></div>);
/** Hebrew-only date picker: day (א׳-ל׳) + Hebrew month (incl. אדר א׳/ב׳). */
export function HebPick({ value, onChange }) {
  const v = value || { d: 1, m: 'Tishri' };
  return (
    <div className="row">
      <select value={v.d} onChange={(e) => onChange({ ...v, d: +e.target.value })}>{Array.from({ length: 30 }, (_, i) => <option key={i} value={i + 1}>{gem(i + 1)}</option>)}</select>
      <select value={v.m} onChange={(e) => onChange({ ...v, m: e.target.value })}>{MONTHS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    </div>);
}
export const FontSel = ({ value, onChange }) => <select value={value} onChange={(e) => onChange(e.target.value)}>{Object.entries(FONT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
export const ScreenSel = ({ value, onChange }) => (
  <select value={value || 'all'} onChange={(e) => onChange(e.target.value)}><option value="all">כל המסכים</option>{Object.entries(SCREEN_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>);
/** Per-item display mode: off / carousel block / full screen (prayers also: fixed bottom bar). */
export const ModeSel = ({ value, onChange, bar, popup }) => (
  <select value={value || (bar ? 'bar' : 'block')} onChange={(e) => onChange(e.target.value)} title="אופן תצוגה">
    <option value="off">כבוי</option>{bar && <option value="bar">ללא שקופית</option>}<option value="block">בלוק בקרוסלה</option><option value="full">מסך מלא</option>{popup && <option value="popup">חלון קופץ של כל זמני התפילות</option>}
  </select>);
/** Per-component settings: font (David/Arial) and slide duration 1-30s. Text SIZE lives only in the block accordion. */
export function DisplayCfg({ st, set, k }) {
  const c = { font: 'david', secs: 10, ...(st.cf || {}).all, ...(st.cf || {})[k] };
  return (
    <Card title="הגדרות תצוגה">
      <label>גופן</label><FontSel value={c.font} onChange={(v) => set(`cf.${k}.font`, v)} />
      <Range label="זמן תצוגת שקופית (שניות)" min={1} max={30} value={c.secs} onChange={(v) => set(`cf.${k}.secs`, v)} />
    </Card>);
}
export const parseY = (x) => {
  x = (x || '').trim(); if (!x) return 0;
  if (/^\d+$/.test(x)) return +x < 1000 ? 5000 + +x : +x;
  const V = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400 };
  let n = 0; for (const c of x.replace(/[^א-ת]/g, '')) n += V[c] || 0; return n ? 5000 + n : 0;
};
