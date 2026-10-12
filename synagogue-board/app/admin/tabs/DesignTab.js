'use client';
import { useState } from 'react';
import { LAYOUTS } from '@/lib/types';
import { Card, DebIn, FontSel, Range, Switch, TextIn } from '../components/UI';
import BlockDesignAccordion from '../components/BlockDesignAccordion';
import WhatsAppImage from '../components/WhatsAppImage';

const PRESETS = [['מקדש ומלכות', { theme: 'gold', frame: 'clean', cardStyle: 'gold', tbg: 'temple', bg: '' }], ['אבני הכותל ועץ זית', { theme: 'classic', frame: 'clean', cardStyle: 'stone', tbg: 'stone', bg: '' }], ['זהב קלאסי', { theme: 'gold', frame: 'clean', cardStyle: 'clean', tbg: 'gold', bg: '' }], ['מודרני נקי', { theme: 'modern', frame: 'clean', cardStyle: 'glass', tbg: 'modern', bg: '' }]];
const TBGS = [['', 'ללא (צבע רגיל)'], ['temple', 'מקדש ומלכות'], ['stone', 'אבני הכותל'], ['gold', 'זהב קלאסי'], ['modern', 'מודרני נקי']];
const COMPS = [['pr', 'פרשה והפטרה'], ['ann', 'הודעות ושיעורים'], ['hal', 'הלכה ומנהגים'], ['mem', 'הנצחות'], ['rf', 'רפואה שלמה']];
/** Fonts, slide durations and paging for every component, in ONE place (no duplicates in the content tabs). */
function CompStyles({ st, set }) {
  return (
    <Card title="גופנים, זמני שקופיות וגלילה">
      {COMPS.map(([k, l]) => { const c = { font: 'david', secs: 10, ...(st.cf || {})[k] }; return (
        <div key={k} style={{ borderBottom: '1px solid var(--ln)', paddingBottom: 8, marginBottom: 8 }}>
          <b>{l}</b>
          <div className="row"><FontSel value={c.font} onChange={(v) => set(`cf.${k}.font`, v)} /></div>
          <Range label="זמן שקופית (שניות)" min={1} max={30} value={c.secs} onChange={(v) => set(`cf.${k}.secs`, v)} />
        </div>); })}
      <Range label="שמות בעמוד · הנצחות" min={1} max={8} value={st.ipp?.yz || 3} onChange={(v) => set('ipp.yz', v)} />
      <Range label="שמות בעמוד · רפואה שלמה" min={1} max={8} value={st.ipp?.rf || 3} onChange={(v) => set('ipp.rf', v)} />
      <Range label="שורות בעמוד (טקסט ארוך מתחלק לעמודים)" min={2} max={14} value={st.lpp || 6} onChange={(v) => set('lpp', v)} />
    </Card>);
}

export default function DesignTab({ ctx: { sid, st, set, syn, cols } }) {
  const up = (file) => {
    if (!file) return; const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); set('bg', c.toDataURL('image/jpeg', 0.6)); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  };
  const Btns = ({ k, opts }) => <div className="row">{opts.map(([v, l]) => <button key={String(v)} type="button" className={`opt ${st[k] === v ? 'on' : ''}`} onClick={() => set(k, v)}>{l}</button>)}</div>;
  const V = [['cr', 'כותרת עליונה'], ['hd', 'פס התאריך העליון'], ['zm', 'סרגל זמני היום'], ['pr', 'פרשת השבוע'], ['cu', 'מנהגי היום / תזכורות'], ['yz', 'לעילוי נשמת'], ['rf', 'רפואה שלמה'], ['qr', 'פינת QR לתרומות'], ['tk', 'סרגל עדכונים נע']];
  return (<>
    <Card title="🎨 ערכות נושא מוכנות (בחירה מהירה)">
      <label>ערכת נושא מלאה (בלחיצה אחת: צבעים, מסגרת וקוביות)</label>
      <div className="grid2">{PRESETS.map(([l, p]) => <button key={l} type="button" className={`opt ${Object.entries(p).every(([k, v]) => st[k] === v) ? 'on' : ''}`} onClick={() => Object.entries(p).forEach(([k, v]) => set(k, v))}>{l}</button>)}</div>
    </Card>
    <details className="cd fold"><summary>⚙️ הגדרות מתקדמות (פריסה, מסגרת, גופנים, גדלי קוביות, צבעים)</summary>
    <Card title="כותרות"><label>כותרת עליונה (ריק = שם בית הכנסת)</label><TextIn value={st.title} onSave={(v) => set('title', v)} /></Card>
    <Card title="עיצוב המסך">
      <label>דגם פריסת מסך</label><div className="grid2">{LAYOUTS.map(([k, l]) => <button key={k} type="button" className={`opt ${String(st.layout) === k ? 'on' : ''}`} onClick={() => set('layout', k)}>{l}</button>)}</div>
      <label>סגנון עיצוב הקוביות</label><div className="grid2">{[['gold', 'זהב יוקרתי'], ['stone', 'אבן ירושלמית'], ['glass', 'זכוכית מודרנית'], ['trad', 'מסורתי / תשמישי קדושה'], ['clean', 'נקי ומודרני']].map(([k, l]) => <button key={k} type="button" className={`opt ${(st.cardStyle || 'clean') === k ? 'on' : ''}`} onClick={() => set('cardStyle', k)}>{l}</button>)}</div>
      <label>סגנון מסגרת ועיטורים</label><div className="grid2">{[['royal', 'זהב מלכותי'], ['stone', 'אבני הכותל'], ['temple', 'היכל ובית המקדש'], ['ornament', 'ערבסק / תחרה'], ['clean', 'נקי / ללא מסגרת']].map(([k, l]) => <button key={k} type="button" className={`opt ${(st.frame || 'royal') === k ? 'on' : ''}`} onClick={() => set('frame', k)}>{l}</button>)}</div>
      <label>תמונת רקע של ערכת נושא</label><div className="grid2">{TBGS.map(([k, l]) => <button key={k} type="button" className={`opt ${(st.tbg || '') === k ? 'on' : ''}`} onClick={() => { set('tbg', k); if (k) set('bg', ''); }}>{l}</button>)}</div>
      <label>ערכת נושא</label><Btns k="theme" opts={[['gold', 'זהב מלכותי'], ['classic', 'שיש קלאסי'], ['modern', 'מודרני כהה']]} />
      <label>זום כללי למסך</label><Btns k="zoom" opts={[[1, 'רגיל'], [1.25, 'גדול'], [1.5, 'ענק']]} />
      <label>אפקט מעבר</label><Btns k="anim" opts={[['fade', 'דהייה'], ['slide', 'החלקה'], ['none', 'ללא']]} />
      <label>צבע מבטא</label><div className="row"><DebIn type="color" value={st.accent || "#f2c85b"} onChange={(x) => set("accent", x)} />{st.accent && <button className="b g" onClick={() => set('accent', '')}>איפוס</button>}</div>
      <label>תמונת רקע</label><input type="file" accept="image/*" onChange={(e) => up(e.target.files[0])} />{st.bg && <button className="b d" onClick={() => set('bg', '')}>הסר תמונה</button>}
    </Card>
    <CompStyles st={st} set={set} />
    <Card title="רכיבים גלויים"><div style={{ color: 'var(--mu)', fontSize: 13 }}>הרכיב מוצג בכל ערכת נושא ובכל דגם. הוא נעלם רק אם כיבית אותו כאן.</div>{V.map(([k, l]) => <Switch key={k} label={l} on={st.vis?.[k] !== false} onChange={(v) => set(`vis.${k}`, v)} />)}</Card>
    <Card title="רוחב עמודות הצד"><Range label="רוחב %" min={20} max={50} value={st.side} onChange={(v) => set('side', v)} /></Card>
    <BlockDesignAccordion st={st} set={set} sid={sid} />
    </details>
    <WhatsAppImage syn={syn} cols={cols} st={st} />
  </>);
}
