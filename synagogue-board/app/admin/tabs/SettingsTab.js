'use client';
import { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { geocode } from '@/lib/geocode';
import { SCREENS, SCREEN_NAMES } from '@/lib/types';
import { Card, Switch, TextIn } from '../components/UI';

/** Synagogue settings: address -> coordinates (kosher-zmanim uses them), Shabbat mode, screen links. */
export default function SettingsTab({ ctx: { sid, syn, st, set, screens } }) {
  const [msg, setMsg] = useState('');
  const zm = st.zm || {};
  const loc = syn.location || { lat: 31.77, lng: 35.21, elevation: 0 };
  const ref = doc(db, 'synagogues', sid);
  async function find(city = syn.city, street = syn.street) {
    if (!city && !street) return; setMsg('מחפש כתובת…');
    const g = await geocode(city, street);
    if (!g) return setMsg('לא נמצא. בדקו את שם העיר או הזינו קואורדינטות ידנית.');
    await updateDoc(ref, { location: { lat: g.lat, lng: g.lng, elevation: g.elevation }, locationSource: g.source });
    setMsg('המיקום נשמר: ' + g.source + '. זמני היום חושבו מחדש.');
  }
  const save = (data) => updateDoc(ref, data);
  const online = (id) => { const s = screens.find((x) => x.id === id); return s?.lastSeen && Date.now() - s.lastSeen.toMillis() < 100000; };
  return (<>
    <Card title="בית הכנסת">
      <label>שם בית הכנסת</label><TextIn value={syn.name} onSave={(v) => save({ name: v })} />
      <label>עיר</label><TextIn value={syn.city} placeholder="ירושלים" onSave={(v) => { save({ city: v }); find(v, syn.street); }} />
      <label>רחוב ומספר בית</label><TextIn value={syn.street} placeholder="רחוב יפו 10" onSave={(v) => { save({ street: v }); find(syn.city, v); }} />
      <button className="b" style={{ marginTop: 8 }} onClick={() => find()}>מצא קואורדינטות ושמור</button>
      <div style={{ fontSize: 13, color: 'var(--mu)', marginTop: 6 }}>{msg}<br />מיקום נוכחי: {(+loc.lat).toFixed(4)}, {(+loc.lng).toFixed(4)} · גובה {loc.elevation || 0} מ׳ {syn.locationSource && '· ' + syn.locationSource}</div>
      <details><summary style={{ cursor: 'pointer', color: 'var(--mu)' }}>הזנה ידנית (מתקדם)</summary>
        <div className="row"><div><label>קו רוחב</label><input type="number" step=".0001" defaultValue={loc.lat} onBlur={(e) => save({ 'location.lat': +e.target.value })} /></div>
          <div><label>קו אורך</label><input type="number" step=".0001" defaultValue={loc.lng} onBlur={(e) => save({ 'location.lng': +e.target.value })} /></div>
          <div><label>גובה (מ׳)</label><input type="number" defaultValue={loc.elevation || 0} onBlur={(e) => save({ 'location.elevation': +e.target.value })} /></div></div></details>
    </Card>
    <Card title="קבוצת וואטסאפ"><label>קישור לקבוצת הווטסאפ של בית הכנסת</label><TextIn value={st.waLink} style={{ direction: 'ltr' }} placeholder="https://chat.whatsapp.com/..." onSave={(v) => set('waLink', v)} /></Card>
    <Card title="זמני היום">
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
      <Switch label="הצג זמני שבת/חג (ידני, לחגים)" on={st.force} onChange={(v) => set('force', v)} />
    </Card>
    <Card title="מסכים">
      {SCREENS.map((id) => (
        <div className="row" key={id} style={{ fontSize: 13 }}>
          <span style={{ flex: '0 0 14px' }}>{screens.some((s) => s.id === id) ? (online(id) ? '🟢' : '🔴') : '⚪'}</span><b style={{ flex: '1 1 80px' }}>{SCREEN_NAMES[id]}</b>
          <span style={{ flex: '3 1 200px', color: 'var(--mu)', direction: 'ltr' }}>/display?s={sid}&amp;screen={id}</span>
        </div>))}
      <div style={{ fontSize: 12, color: 'var(--mu)' }}>פתחו את הכתובת בדפדפן הטלוויזיה (Fully Kiosk). המסך מתחבר בעצמו.</div>
    </Card>
  </>);
}
