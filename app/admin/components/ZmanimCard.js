'use client';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, Switch } from './UI';

/** Daily zmanim settings (candle lighting, nusach, shma/tzeit method...). Lives in the prayer-times tab, next to the prayers themselves. */
const PROF = [['ashkenaz', 'אשכנז / גר״א', 'ashkenaz', { shma: 'gra', tzeit: '40', rt: false }], ['hasidic', 'מג״א / חסידי', 'ashkenaz', { shma: 'mga', tzeit: '40', rt: true }], ['sefard', 'ספרד ועדות המזרח', 'sefard', { shma: 'gra', tzeit: '13.5z', rt: false }]];
export default function ZmanimCard({ sid, syn, st, set }) {
  const zm = st.zm || {};
  const save = (data) => updateDoc(doc(db, 'synagogues', sid), data);
  return (<>
    <Card fold title="🕰️ הגדרות זמני היום (נוסח, שיטות חישוב, הדלקת נרות)">
      <label>הדלקת נרות (דקות לפני שקיעה)</label><input type="number" defaultValue={st.candle} onBlur={(e) => set('candle', +e.target.value)} />
      <label>פרופיל מנהג (נוסח התפילה + שיטת זמני היום + הלכות · אפשר לכוונן למטה)</label>
      <div className="row">{PROF.map(([k, l, nu, p]) => <button key={k} className={`b ${(zm.profile || (syn.nusach === 'ashkenaz' ? 'ashkenaz' : syn.nusach ? 'sefard' : '')) === k ? '' : 'g'}`} onClick={() => { set('zm', { ...zm, profile: k, ...p }); const n = k === 'sefard' && syn.nusach === 'edot_hamizrach' ? 'edot_hamizrach' : nu; if (n !== syn.nusach) save({ nusach: n }); }}>{l}</button>)}</div>
      <div style={{ fontSize: 12, color: 'var(--mu)' }}>הפרופיל קובע ברקע את נוסח התפילה וההפטרה, שיטת קריאת שמע, צאת הכוכבים ורבינו תם.</div>
      <label>סוף זמן קריאת שמע</label>
      <div className="row">{[['gra', 'גר״א'], ['mga', 'מג״א'], ['both', 'שתי השיטות']].map(([k, l]) => <button key={k} className={`b ${(zm.shma || st.shma || 'gra') === k ? '' : 'g'}`} onClick={() => set('zm.shma', k)}>{l}</button>)}</div>
      <label>צאת הכוכבים / יציאת שבת</label>
      <select value={zm.tzeit || '8.5'} onChange={(e) => set('zm.tzeit', e.target.value)}><option value="8.5">8.5 מעלות</option><option value="13.5z">13.5 דקות זמניות</option><option value="20">20 דקות מהשקיעה</option><option value="30">30 דקות מהשקיעה</option><option value="40">40 דקות מהשקיעה</option></select>
      <Switch label="הצג זמן רבינו תם (72 דקות)" on={!!zm.rt} onChange={(v) => set('zm.rt', v)} />
      <Switch label="הצג נץ החמה הנראה (טופוגרפי)" on={zm.netzVisible !== false} onChange={(v) => set('zm.netzVisible', v)} />
      <label>זמני היום בסרגל התחתון (מקדש ומלכות · תצוגה קבועה)</label>
      {[['n', 'זריחה (נץ החמה)'], ['s', 'סוף זמן ק״ש'], ['k', 'שקיעה'], ['t', 'צאת הכוכבים'], ['r', 'רבינו תם (בשבת / לפי ההגדרה)']].map(([k, l]) => <Switch key={k} label={l} on={zm.bi?.[k] !== false} onChange={(v) => set(`zm.bi.${k}`, v)} />)}
      <Switch label="הצג זמני שבת/חג (ידני, לחגים)" on={st.force} onChange={(v) => set('force', v)} />
    </Card>
  </>);
}
