'use client';
import { useState } from 'react';
import { LAYOUTS } from '@/lib/types';
import { Card, DebIn, Range, Switch, TextIn } from '../components/UI';
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
    // the picture is stored inside the synagogue document (1MB Firestore limit): shrink until it is safely small
    rd.onload = () => { const im = new Image(); im.onerror = () => alert('לא ניתן לקרוא את התמונה'); im.onload = () => {
      let k = Math.min(1, 1400 / Math.max(im.width, im.height)), q = 0.6, url = '';
      for (let i = 0; i < 6; i++) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); url = c.toDataURL('image/jpeg', q); if (url.length < 600000) break; k *= 0.75; q = Math.max(0.4, q - 0.05); }
      if (url.length >= 900000) return alert('התמונה גדולה מדי – בחרו תמונה קטנה יותר');
      set('bg', url); }; im.src = rd.result; };
    rd.onerror = () => alert('לא ניתן לקרוא את הקובץ');
    rd.readAsDataURL(file);
  };
  const Btns = ({ k, opts }) => <div className="row">{opts.map(([v, l]) => <button key={String(v)} type="button" className={`opt ${st[k] === v ? 'on' : ''}`} onClick={() => set(k, v)}>{l}</button>)}</div>;
  const V0 = [['cr', 'כותרת בית הכנסת (שם + איור)'], ['hd', 'תאריך עברי ולועזי'], ['pt', 'זמני תפילות בכותרת העליונה'], ['zm', 'זמני היום (סרגל תחתון)'], ['tk', 'סרגל עדכונים רץ (תחתון)'], ['pr', 'פרשת השבוע והפטרה'], ['cu', 'מנהגי היום / תזכורות'], ['yz', 'לעילוי נשמת'], ['rf', 'רפואה שלמה'], ['qr', 'פינת QR לתרומות']];
  // switches that change nothing in the current layout are not offered: 'pt' (prayer times in the title bar) exists only on the royal screen; 'qr' only on royal model 4
  const V = V0.filter(([k]) => !(k === 'pt' && !royal) && !(k === 'qr' && royal && String(st.layout) !== '4'));
  const BAR = ['cr', 'hd', 'pt', 'zm', 'tk'], VB = V.filter(([k]) => BAR.includes(k)), VC = V.filter(([k]) => !BAR.includes(k));
  const shown = V.filter(([k]) => st.vis?.[k] !== false).length;
  const RESET = ['layout', 'frame', 'cardStyle', 'zoom', 'anim', 'accent', 'bg', 'tbg', 'side', 'sideH', 'scrollZ', 'vis', 'cf', 'blocks', 'ipp', 'lpp', 'fsAll', 'hdMode', 'btMode', 'subtitle', 'footerText'];
  const [pv, setPv] = useState(false);
  return (<>
    <details className="cd fold" open={pv} onToggle={(e) => setPv(e.currentTarget.open)}><summary>👁 תצוגה מקדימה חיה (בתוך הדף)</summary>{pv && <InlinePreview sid={sid} />}</details>
    <Card fold open title="🎨 דגם וסגנון המסך">
      {royal && <div className="mu">במצב ״מקדש ומלכות״ העיצוב (קלף וזהב) קבוע. ניתן לשנות כאן גודל, מיקום וסדר בלבד.</div>}
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
      <div className="mu">כאן נמצאות כל הגדרות הסרגלים: טקסט, אופן תצוגה (קבוע/רץ) והצגה. את הטקסטים והזמנים עצמם מנהלים בלשונית ״תוכן המסך״.</div>
    <div className="mu">שם בית הכנסת נערך במקום אחד: ״הגדרות מערכת״ › בית הכנסת.</div>{royal && <PickText label="כותרת משנה במסך מקדש ומלכות" value={st.subtitle} def="תורה · תפילה · חסד" opts={['תורה · תפילה · חסד', 'תורה · עבודה · גמילות חסדים', 'קהילה · תורה · תפילה', 'מקום של תורה ותפילה']} onSave={(v) => set('subtitle', v)} />}
      {royal && <PickText label="טקסט קבוע בסרגל התחתון" value={st.footerText} def="עם ישראל חי" opts={['עם ישראל חי', 'שבת שלום', 'שנה טובה ומתוקה', 'חזק וברוך']} onSave={(v) => set('footerText', v)} />}
      {royal ? <><label>אופן תצוגת הסרגלים (מקדש ומלכות)</label>
      <div className="row"><div><label>סרגל כותרת עליון (זמני תפילות)</label><select value={['marquee', 'fixed'].includes(st.hdMode) ? st.hdMode : 'auto'} onChange={(e) => set('hdMode', e.target.value)}><option value="auto">אוטומטי – קבוע, ורץ רק כשיש יותר מדי זמנים</option><option value="fixed">קבוע תמיד (הגופן קטן אם צריך)</option><option value="marquee">רץ תמיד</option></select></div><div><label>סרגל תחתון (זמני היום)</label><select value={['marquee', 'fixed'].includes(st.btMode) ? st.btMode : 'auto'} onChange={(e) => set('btMode', e.target.value)}><option value="auto">אוטומטי – קבוע, ורץ רק כשהטקסט ארוך מדי</option><option value="fixed">קבוע – אם יש יותר מדי טקסט, עובר לקרוסלה של דפים מתחלפים (בגודל קריא)</option><option value="marquee">רץ תמיד</option></select></div></div>
      <div className="mu12">הסרגל התחתון רץ אוטומטית אם מוצגים הרבה זמנים או כשסרגל רץ (טקסט מתגלגל) פעיל. כדי שיהיה קבוע בכל מקרה – בחרו ״קבוע תמיד״ ופחתו זמנים ב״זמני תפילות › אילו זמנים מוצגים״.</div></> : <div className="mu12">כותרת משנה, טקסט קבוע בסרגל התחתון ואופן תצוגת הסרגלים (קבוע/רץ) חלים על מסך ״מקדש ומלכות״ בלבד (״סגנון עיצוב ורקע המסך״ › מקדש ומלכות).</div>}
      <Switch label="מונה שניות בולט על שקופית הקרוסלה (בנוסף לפס ההתקדמות)" on={st.cdn !== false} onChange={(v) => set('cdn', v)} />
      {VB.map(([k, l]) => <Switch key={k} label={k === 'tk' && !feat('runningTicker') ? l + ' 🔒 (חבילת PRO)' : k === 'tk' && !st.tkText ? l + ' – הזינו טקסט ב״תוכן המסך › הודעות״' : l} on={st.vis?.[k] !== false} onChange={(v) => set(`vis.${k}`, v)} />)}
    </Card>
    <Card fold title={`👁 רכיבי תוכן גלויים · ${shown} מתוך ${V.length} מוצגים`}><div className="mu">הרכיב מוצג בכל ערכת נושא ובכל דגם. הוא נעלם רק אם כיבית אותו כאן.</div>{VC.map(([k, l]) => <Switch key={k} label={l} on={st.vis?.[k] !== false} onChange={(v) => set(`vis.${k}`, v)} />)}</Card>
    <CompStyles st={st} set={set} />
    <Card fold title="📐 גודל עמודות הצד">
      <div className="mu">משפיע חי על המסך. הרוחב משנה את עמודת ההנצחות/רפואה שלמה והפאנל המרכזי מתאים את עצמו. למידות של קובייה בודדת – ״התאמה אישית לפי קובייה״.</div>
      <Range label="רוחב עמודות הצד %" min={20} max={50} value={st.side} onChange={(v) => set('side', v)} />
      {royal && <Range label="גובה קוביות הצד % (מקדש ומלכות)" min={60} max={115} value={st.sideH || 100} onChange={(v) => set('sideH', v)} />}
      {royal && <Range label="גודל הקלף במסך מלא % (זמני תפילות / הלכה יומית)" min={100} max={170} value={st.scrollZ || 130} onChange={(v) => set('scrollZ', v)} />}
      <button className="b g" onClick={() => { set('side', 32); set('sideH', 100); set('scrollZ', 130); }}>איפוס מידות</button>
    </Card>
    <details className="cd fold"><summary>🧩 התאמה אישית לפי קובייה (מידות, גופן, צבעים, זמן שקופית)</summary>
      <BlockDesignAccordion st={st} set={set} sid={sid} royal={royal} />
    </details>
    <WhatsAppImage syn={syn} cols={cols} st={st} set={set} />
  </>);
}
