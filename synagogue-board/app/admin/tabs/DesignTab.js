'use client';
import { useState } from 'react';
import { LAYOUTS, DEFAULT_SETTINGS } from '@/lib/types';
import { Card, DebIn, FontSel, Range, Switch, TextIn } from '../components/UI';
import { isRoyal } from '@/lib/types';
import BlockDesignAccordion from '../components/BlockDesignAccordion';
import WhatsAppImage from '../components/WhatsAppImage';
import InlinePreview from '../components/InlinePreview';

/** Dropdown of ready-made texts + a custom option; empty value = the default text. */
function PickText({ label, value, def, opts, onSave }) {
  const cur = value || '', known = !cur || opts.includes(cur), [custom, setCustom] = useState(!known);
  const sel = custom ? '__c' : cur;
  return (<>
    <label>{label}</label>
    <select value={sel} onChange={(e) => { if (e.target.value === '__c') setCustom(true); else { setCustom(false); onSave(e.target.value === '' ? '' : e.target.value); } }}>
      <option value="">ברירת מחדל ({def})</option>
      {opts.filter((o) => o !== def).map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__c">טקסט מותאם אישית…</option>
    </select>
    {custom && <TextIn value={cur} onSave={onSave} placeholder={def} />}
  </>);
}
const TBGS = [['', 'אוטומטי'], ['none', 'ללא תמונת רקע'], ['temple', 'מקדש ומלכות'], ['stone', 'אבני הכותל'], ['gold', 'זהב קלאסי'], ['modern', 'מודרני נקי']];
const COMPS = [['pr', 'פרשה והפטרה'], ['ann', 'הודעות ושיעורים'], ['hal', 'הלכה ומנהגים'], ['mem', 'הנצחות'], ['rf', 'רפואה שלמה']];
/** Paging only (fonts / slide times / sizes live in the single per-block accordion). */
function CompStyles({ st, set }) {
  return (
    <Card fold title="📄 עימוד שמות וטקסט ארוך">
      <Range label="שמות בעמוד · הנצחות" min={1} max={8} value={st.ipp?.yz || 3} onChange={(v) => set('ipp.yz', v)} />
      <Range label="שמות בעמוד · רפואה שלמה" min={1} max={8} value={st.ipp?.rf || 3} onChange={(v) => set('ipp.rf', v)} />
      <Range label="שורות בעמוד (טקסט ארוך מתחלק לעמודים)" min={2} max={14} value={st.lpp || 6} onChange={(v) => set('lpp', v)} />
    </Card>);
}

export default function DesignTab({ ctx: { sid, st, set, syn, cols, feat } }) {
  const royal = isRoyal(st);
  const up = (file) => {
    if (!file) return; const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); set('bg', c.toDataURL('image/jpeg', 0.6)); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  };
  const Btns = ({ k, opts }) => <div className="row">{opts.map(([v, l]) => <button key={String(v)} type="button" className={`opt ${st[k] === v ? 'on' : ''}`} onClick={() => set(k, v)}>{l}</button>)}</div>;
  const V = [['cr', 'כותרת בית הכנסת (שם + איור)'], ['hd', 'תאריך עברי ולועזי'], ['pt', 'זמני תפילות בכותרת העליונה'], ['zm', 'זמני היום (סרגל תחתון)'], ['tk', 'סרגל עדכונים רץ (תחתון)'], ['pr', 'פרשת השבוע והפטרה'], ['cu', 'מנהגי היום / תזכורות'], ['yz', 'לעילוי נשמת'], ['rf', 'רפואה שלמה'], ['qr', 'פינת QR לתרומות']];
  const BAR = ['cr', 'hd', 'pt', 'zm', 'tk'], VB = V.filter(([k]) => BAR.includes(k)), VC = V.filter(([k]) => !BAR.includes(k));
  const shown = V.filter(([k]) => st.vis?.[k] !== false).length;
  const RESET = ['layout', 'frame', 'cardStyle', 'zoom', 'anim', 'accent', 'bg', 'tbg', 'side', 'sideH', 'vis', 'cf', 'blocks', 'ipp', 'lpp', 'fsAll', 'hdMode', 'btMode', 'subtitle', 'footerText'];
  const [pv, setPv] = useState(false);
  return (<>
    <details className="cd fold" open={pv} onToggle={(e) => setPv(e.currentTarget.open)}><summary>👁 תצוגה מקדימה חיה (בתוך הדף)</summary>{pv && <InlinePreview sid={sid} />}</details>
    <Card fold open title="🎨 דגם וסגנון המסך">
      {royal && <div style={{ color: 'var(--mu)', fontSize: 13 }}>במצב ״מקדש ומלכות״ העיצוב (קלף וזהב) קבוע. ניתן לשנות כאן גודל, מיקום וסדר בלבד.</div>}
      <label>דגם פריסת מסך</label><div className="grid2">{LAYOUTS.map(([k, l]) => <button key={k} type="button" className={`opt ${String(st.layout) === k ? 'on' : ''}`} onClick={() => set('layout', k)}>{l}</button>)}</div>
      {!royal && <><label>סגנון עיצוב הקוביות</label><div className="grid2">{[['gold', 'זהב יוקרתי'], ['stone', 'אבן ירושלמית'], ['glass', 'זכוכית מודרנית'], ['trad', 'מסורתי / תשמישי קדושה'], ['clean', 'נקי ומודרני']].map(([k, l]) => <button key={k} type="button" className={`opt ${(st.cardStyle || 'clean') === k ? 'on' : ''}`} onClick={() => set('cardStyle', k)}>{l}</button>)}</div></>}
      {!royal && <><label>סגנון מסגרת ועיטורים</label><div className="grid2">{[['royal', 'זהב מלכותי'], ['stone', 'אבני הכותל'], ['temple', 'היכל ובית המקדש'], ['ornament', 'ערבסק / תחרה'], ['clean', 'נקי / ללא מסגרת']].map(([k, l]) => <button key={k} type="button" className={`opt ${(st.frame || 'royal') === k ? 'on' : ''}`} onClick={() => set('frame', k)}>{l}</button>)}</div></>}
      <label>סגנון עיצוב ורקע המסך</label><div className="grid2">{TBGS.map(([k, l]) => <button key={k} type="button" className={`opt ${(st.tbg || '') === k ? 'on' : ''}`} onClick={() => { set('tbg', k); if (k) set('bg', ''); }}>{l}</button>)}</div>
      <label>זום כללי למסך</label><Btns k="zoom" opts={[[1, 'רגיל'], [1.25, 'גדול'], [1.5, 'ענק']]} />
      <label>אפקט מעבר</label><Btns k="anim" opts={[['fade', 'דהייה'], ['slide', 'החלקה'], ['none', 'ללא']]} />
      <label>צבע מבטא</label><div className="row"><DebIn type="color" value={st.accent || "#f2c85b"} onChange={(x) => set("accent", x)} />{st.accent && <button className="b g" onClick={() => set('accent', '')}>איפוס</button>}</div>
      <label>תמונת רקע</label><input type="file" accept="image/*" onChange={(e) => up(e.target.files[0])} />{st.bg && <button className="b d" onClick={() => set('bg', '')}>הסר תמונה</button>}
    </Card>
    <Card fold title="🔝 סרגלים וכותרות (עליון ותחתון)">
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>כאן נמצאות כל הגדרות הסרגלים: טקסט, אופן תצוגה (קבוע/רץ) והצגה. את הטקסטים והזמנים עצמם מנהלים בלשונית ״תוכן המסך״.</div>
    <div style={{ color: 'var(--mu)', fontSize: 13 }}>שם בית הכנסת נערך במקום אחד: ״הגדרות מערכת״ › בית הכנסת.</div><PickText label="כותרת משנה במסך מקדש ומלכות" value={st.subtitle} def="תורה · תפילה · חסד" opts={['תורה · תפילה · חסד', 'תורה · עבודה · גמילות חסדים', 'קהילה · תורה · תפילה', 'מקום של תורה ותפילה']} onSave={(v) => set('subtitle', v)} />
      <PickText label="טקסט קבוע בסרגל התחתון" value={st.footerText} def="עם ישראל חי" opts={['עם ישראל חי', 'שבת שלום', 'שנה טובה ומתוקה', 'חזק וברוך']} onSave={(v) => set('footerText', v)} />
      <label>אופן תצוגת הסרגלים (מקדש ומלכות)</label>
      <div className="row"><div><label>סרגל כותרת עליון (זמני תפילות)</label><select value={st.hdMode || 'static'} onChange={(e) => set('hdMode', e.target.value)}><option value="static">קבוע (סטטי)</option><option value="marquee">רץ (Marquee)</option></select></div><div><label>סרגל כותרת תחתון (זמני היום)</label><select value={st.btMode || 'static'} onChange={(e) => set('btMode', e.target.value)}><option value="static">קבוע (סטטי)</option><option value="marquee">רץ (Marquee)</option></select></div></div>
      {VB.map(([k, l]) => <Switch key={k} label={k === 'tk' && !feat('runningTicker') ? l + ' 🔒 (חבילת PRO)' : k === 'tk' && !st.tkText ? l + ' – הזינו טקסט ב״תוכן המסך › הודעות״' : l} on={st.vis?.[k] !== false} onChange={(v) => set(`vis.${k}`, v)} />)}
    </Card>
    <Card fold title={`👁 רכיבי תוכן גלויים · ${shown} מתוך ${V.length} מוצגים`}><div style={{ color: 'var(--mu)', fontSize: 13 }}>הרכיב מוצג בכל ערכת נושא ובכל דגם. הוא נעלם רק אם כיבית אותו כאן.</div>{VC.map(([k, l]) => <Switch key={k} label={l} on={st.vis?.[k] !== false} onChange={(v) => set(`vis.${k}`, v)} />)}</Card>
    <CompStyles st={st} set={set} />
    <Card fold title="📐 גודל עמודות הצד">
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>משפיע חי על המסך. הרוחב משנה את עמודת ההנצחות/רפואה שלמה והפאנל המרכזי מתאים את עצמו. למידות של קובייה בודדת – ״התאמה אישית לפי קובייה״.</div>
      <Range label="רוחב עמודות הצד %" min={20} max={50} value={st.side} onChange={(v) => set('side', v)} />
      <Range label="גובה קוביות הצד % (מקדש ומלכות)" min={60} max={115} value={st.sideH || 100} onChange={(v) => set('sideH', v)} />
      <button className="b g" onClick={() => { set('side', 32); set('sideH', 100); }}>איפוס מידות</button>
    </Card>
    <details className="cd fold"><summary>🧩 התאמה אישית לפי קובייה (מידות, גופן, צבעים, זמן שקופית)</summary>
      <BlockDesignAccordion st={st} set={set} sid={sid} royal={royal} />
    </details>
    <WhatsAppImage syn={syn} cols={cols} st={st} set={set} />
  </>);
}
