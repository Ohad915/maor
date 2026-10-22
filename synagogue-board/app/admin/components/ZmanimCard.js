'use client';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fmt, getZmanim, zOn, zOpts, ZDEF } from '@/lib/zmanim';
import { Card, Switch } from './UI';

const ALLON = Object.fromEntries(ZDEF.map(([k]) => [k, true]));
/** Calculation profiles: nusach + the zmanim method they imply (all remain fine-tunable below). */
const PROF = [
  ['ashkenaz', 'אשכנז / גר״א', 'ashkenaz', { method: 'std', shma: 'gra', tzeit: '40', rt: false }],
  ['hasidic', 'מג״א / חסידי', 'ashkenaz', { method: 'std', shma: 'mga', tzeit: '40', rt: true }],
  ['sefard', 'ספרד ועדות המזרח', 'sefard', { method: 'std', shma: 'gra', tzeit: '13.5z', rt: false }],
  ['maor', 'שיטת לוח המאור (אור החיים)', 'sefard', { method: 'maor', shma: 'both', tzeit: '13.5m', rt: true, netzVisible: true, bi: ALLON, candle: 20 }],
];
const OFF = [['a', 'עלות השחר'], ['s', 'סוף זמן ק״ש'], ['tf', 'סוף זמן תפילה'], ['c', 'חצות'], ['mg', 'מנחה גדולה'], ['mk', 'מנחה קטנה'], ['pl', 'פלג המנחה'], ['t', 'צאת הכוכבים'], ['se', 'צאת השבת'], ['r', 'רבינו תם']];

/** Daily zmanim settings, split into accordions. Lives in the prayer-times tab, next to the prayers themselves. */
export default function ZmanimCard({ sid, syn, st, set }) {
  const zm = st.zm || {}, o = zOpts(st);
  const save = (data) => updateDoc(doc(db, 'synagogues', sid), data);
  const cur = zm.profile || (syn.nusach === 'ashkenaz' ? 'ashkenaz' : syn.nusach ? 'sefard' : '');
  let live = null; try { live = getZmanim(new Date(), syn.location || { lat: 31.77, lng: 35.21 }, o); } catch {}
  const liveOf = (k) => (live ? { a: live.alot, n: live.netz, s: live.shma, tf: o.shma === 'mga' ? live.tfilaMga : live.tfilaGra, c: live.chatzot, mg: live.minchaGedola, mk: live.minchaKetana, pl: live.plag, k: live.shkia, t: live.tzeit, se: live.shabEnd, r: live.rt }[k] : null);
  return (<>
    <Card fold title="🕰️ שיטת חישוב וזמני היום (פרופיל מנהג)">
      <label>פרופיל – קובע את נוסח התפילה וההפטרה ואת שיטת חישוב הזמנים</label>
      <div className="row">{PROF.map(([k, l, nu, p]) => <button key={k} className={`b ${cur === k ? '' : 'g'}`} onClick={() => { const { candle, ...zp } = p; set('zm', { ...zm, profile: k, ...zp }); if (candle) set('candle', candle); const n = k === 'sefard' && syn.nusach === 'edot_hamizrach' ? 'edot_hamizrach' : nu; if (n !== syn.nusach) save({ nusach: n }); }}>{l}</button>)}</div>
      {cur === 'maor' && <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.5 }}>שיטת לוח המאור (אור החיים) מכוילת על הלוח המודפס של ירושלים (תשפ״ז): נץ ושקיעה לפי אופק ההר, ומהם נגזרים עלות השחר, קריאת שמע ותפילה (גר״א ומג״א), חצות, מנחה גדולה וקטנה, פלג, צאת הכוכבים (13.5 דק׳), צאת השבת, רבינו תם והדלקת נרות 20 דק׳. הכיול אמפירי והסטייה מול הלוח כדקה. אפשר לכוונן ב״היסטים ידניים״.</div>}
      <label>הדלקת נרות (דקות לפני שקיעה)</label><input type="number" defaultValue={st.candle} onBlur={(e) => set('candle', +e.target.value)} />
    </Card>
    <Card fold title="📺 אילו זמנים מוצגים במסך התצוגה">
      <div style={{ fontSize: 12, color: 'var(--mu)' }}>הרשימה מוצגת בסרגל התחתון ובשקף זמני היום. סמנו רק מה שרוצים לראות. (רבינו תם מוצג רק בשבת/חג ובתנאי שהופעל למעלה.)</div>
      {ZDEF.map(([k, l]) => <div key={k} className="row"><b style={{ flex: '3 1 150px', fontWeight: 500 }}>{l}</b><span style={{ flex: '1 1 50px', color: 'var(--mu)', direction: 'ltr', fontSize: 13 }}>{live ? fmt(liveOf(k)) : ''}</span><label className="sw"><input type="checkbox" checked={zOn(zm, k)} onChange={(e) => set(`zm.bi.${k}`, e.target.checked)} /><i /></label></div>)}
      <div style={{ fontSize: 12, color: 'var(--mu)' }}>המספרים הם הזמנים של היום לפי מיקום בית הכנסת והשיטה שנבחרה.</div>
      <Switch label="הצג זמני שבת/חג (ידני, לחגים)" on={st.force} onChange={(v) => set('force', v)} />
    </Card>
    <Card fold title="⏱ היסטים ידניים (דקות)">
      <div style={{ fontSize: 12, color: 'var(--mu)' }}>להוספה או הפחתה של דקות לזמן מסוים (למשל +5 למנחה קטנה, או −2). נץ החמה ושקיעה לא ניתנים להזזה כי זמני התפילות מחושבים מהם.</div>
      <div className="row" style={{ flexWrap: 'wrap' }}>{OFF.map(([k, l]) => <div key={k} style={{ flex: '1 1 120px' }}><label>{l}</label><input type="number" step="1" min="-60" max="60" defaultValue={zm.off?.[k] || 0} onBlur={(e) => set(`zm.off.${k}`, Math.max(-60, Math.min(60, +e.target.value || 0)))} style={{ direction: 'ltr' }} /></div>)}</div>
    </Card>
  </>);
}
