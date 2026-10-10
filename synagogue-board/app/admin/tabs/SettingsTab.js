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
      <label>סוף זמן ק״ש</label><select value={st.shma} onChange={(e) => set('shma', e.target.value)}><option value="gra">גר״א</option><option value="mga">מג״א</option></select>
      <Switch label="מצב שבת/חג ידני (לחגים)" on={st.force} onChange={(v) => set('force', v)} />
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
