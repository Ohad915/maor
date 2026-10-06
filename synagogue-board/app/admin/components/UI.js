'use client';
import { MONTHS, gem } from '@/lib/hebrew';
import { FONT_LABELS } from '@/lib/types';

export const Card = ({ title, children, className = '' }) => <div className={`cd ${className}`}>{title && <b>{title}</b>}{children}</div>;
/** Text input that saves on blur (one Firestore write, not one per keystroke). */
export const TextIn = ({ value, onSave, area, ...p }) => {
  const C = area ? 'textarea' : 'input';
  return <C key={value} defaultValue={value ?? ''} onBlur={(e) => e.target.value !== (value ?? '') && onSave(e.target.value)} {...p} />;
};
export const Switch = ({ on, onChange, label }) => (
  <div className="row"><b style={{ flex: '3 1 160px', fontWeight: 500 }}>{label}</b>
    <label className="sw"><input type="checkbox" checked={!!on} onChange={(e) => onChange(e.target.checked)} /><i /></label></div>);
export const Range = ({ label, min, max, value, onChange }) => (
  <><label>{label}: {value}</label><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} /></>);
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
/** Per-component display settings: font (David/Arial), size 12-26, slide duration 1-30s. */
export function DisplayCfg({ st, set, k }) {
  const c = { font: 'david', size: 18, secs: 10, ...(st.cf || {})[k] };
  return (
    <Card title="הגדרות תצוגה">
      <label>גופן</label><FontSel value={c.font} onChange={(v) => set(`cf.${k}.font`, v)} />
      <Range label="גודל גופן" min={12} max={26} value={c.size} onChange={(v) => set(`cf.${k}.size`, v)} />
      <Range label="זמן תצוגת שקופית (שניות)" min={1} max={30} value={c.secs} onChange={(v) => set(`cf.${k}.secs`, v)} />
    </Card>);
}
export const parseY = (x) => {
  x = (x || '').trim(); if (!x) return 0;
  if (/^\d+$/.test(x)) return +x < 1000 ? 5000 + +x : +x;
  const V = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400 };
  let n = 0; for (const c of x.replace(/[^א-ת]/g, '')) n += V[c] || 0; return n ? 5000 + n : 0;
};
