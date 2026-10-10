'use client';
import { useState } from 'react';
import { LAYOUTS } from '@/lib/types';
import { Card, FontSel, Range, Switch, TextIn } from '../components/UI';
import BlockDesignAccordion from '../components/BlockDesignAccordion';
import WhatsAppImage from '../components/WhatsAppImage';

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
  const Btns = ({ k, opts }) => <div className="row">{opts.map(([v, l]) => <button key={v} className={`b ${st[k] === v ? '' : 'g'}`} onClick={() => set(k, v)}>{l}</button>)}</div>;
  const V = [['cr', 'כותרת עליונה'], ['hd', 'פס התאריך העליון'], ['zm', 'סרגל זמני היום'], ['pr', 'פרשת השבוע'], ['cu', 'מנהגי היום / תזכורות'], ['yz', 'לעילוי נשמת'], ['rf', 'רפואה שלמה'], ['qr', 'פינת QR לתרומות'], ['tk', 'סרגל עדכונים נע']];
  return (<>
    <Card title="כותרות"><label>כותרת עליונה (ריק = שם בית הכנסת)</label><TextIn value={st.title} onSave={(v) => set('title', v)} /></Card>
    <Card title="עיצוב מסך ראשי">
      <label>דגם פריסת מסך</label><select value={st.layout} onChange={(e) => set('layout', e.target.value)}>{LAYOUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <label>סגנון עיצוב הקוביות</label><select value={st.cardStyle || 'clean'} onChange={(e) => set('cardStyle', e.target.value)}>{[['gold', 'זהב יוקרתי (Golden Elegance)'], ['stone', 'אבן ירושלמית עתיקה (Jerusalem Stone)'], ['glass', 'זכוכית מודרנית (Glassmorphism)'], ['trad', 'מסורתי / תשמישי קדושה (Traditional)'], ['clean', 'נקי ומודרני (Minimalist)']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <label>סגנון מסגרת ועיטורים</label><select value={st.frame || 'royal'} onChange={(e) => set('frame', e.target.value)}>{[['royal', 'זהב מלכותי (Royal Gold)'], ['stone', 'אבני הכותל (Jerusalem Stone)'], ['temple', 'היכל ובית המקדש (Temple Pillars)'], ['ornament', 'ערבסק / תחרה מסורתית (Ornament)'], ['clean', 'נקי / ללא מסגרת (Clean)']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <label>ערכת נושא</label><Btns k="theme" opts={[['gold', 'זהב מלכותי'], ['classic', 'שיש קלאסי'], ['modern', 'מודרני כהה']]} />
      <label>זום כללי למסך</label><Btns k="zoom" opts={[[1, 'רגיל'], [1.25, 'גדול'], [1.5, 'ענק']]} />
      <label>אפקט מעבר</label><Btns k="anim" opts={[['fade', 'דהייה'], ['slide', 'החלקה'], ['none', 'ללא']]} />
      <label>צבע מבטא</label><div className="row"><input type="color" value={st.accent || '#f2c85b'} onChange={(e) => set('accent', e.target.value)} />{st.accent && <button className="b g" onClick={() => set('accent', '')}>איפוס</button>}</div>
      <label>תמונת רקע</label><input type="file" accept="image/*" onChange={(e) => up(e.target.files[0])} />{st.bg && <button className="b d" onClick={() => set('bg', '')}>הסר תמונה</button>}
    </Card>
    <CompStyles st={st} set={set} />
    <Card title="רכיבים גלויים"><div style={{ color: 'var(--mu)', fontSize: 13 }}>הרכיב מוצג בכל ערכת נושא ובכל דגם. הוא נעלם רק אם כיבית אותו כאן.</div>{V.map(([k, l]) => <Switch key={k} label={l} on={st.vis?.[k] !== false} onChange={(v) => set(`vis.${k}`, v)} />)}</Card>
    <Card title="רוחב עמודות הצד"><Range label="רוחב %" min={20} max={50} value={st.side} onChange={(v) => set('side', v)} /></Card>
    <BlockDesignAccordion st={st} set={set} sid={sid} />
    <WhatsAppImage syn={syn} cols={cols} st={st} />
  </>);
}
