'use client';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, Switch } from './UI';

/** Daily zmanim settings (candle lighting, nusach, shma/tzeit method...). Lives in the prayer-times tab, next to the prayers themselves. */
export default function ZmanimCard({ sid, syn, st, set }) {
  const zm = st.zm || {};
  const save = (data) => updateDoc(doc(db, 'synagogues', sid), data);
  return (<>
    <Card fold title="🕰️ הגדרות זמני היום (נוסח, שיטות חישוב, הדלקת נרות)">
      <label>הדלקת נרות (דקות לפני שקיעה)</label><input type="number" defaultValue={st.candle} onBlur={(e) => set('candle', +e.target.value)} />
      <label>נוסח / מנהג</label><select value={syn.nusach || 'ashkenaz'} onChange={(e) => save({ nusach: e.target.value })}><option value="ashkenaz">אשכנז</option><option value="sefard">ספרד</option><option value="edot_hamizrach">עדות המזרח</option></select>
      <label>פרופיל מוכן (קובע ברירות מחדל, אפשר לכוונן)</label>
      <div className="row">{[['ashkenaz', 'אשכנז / גר״א', { shma: 'gra', tzeit: '40', rt: false }], ['hasidic', 'מג״א / חסידי', { shma: 'mga', tzeit: '40', rt: true }], ['sefard', 'ספרד ועדות המזרח', { shma: 'gra', tzeit: '13.5z', rt: false }]].map(([k, l, p]) => <button key={k} className={`b ${zm.profile === k ? '' : 'g'}`} onClick={() => set('zm', { ...zm, profile: k, ...p })}>{l}</button>)}</div>
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
