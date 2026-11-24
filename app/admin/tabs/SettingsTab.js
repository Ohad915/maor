'use client';
import { useState } from 'react';
import { updateDoc, doc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { geocode } from '@/lib/geocode';
import { SCREENS, SCREEN_NAMES } from '@/lib/types';
import { Card, TextIn } from '../components/UI';
import ScreenLink from '../components/ScreenLink';

/** Synagogue settings: address -> coordinates (kosher-zmanim uses them), Shabbat mode, screen links. */
function JoinCard({ sid }) {
  const [code, setCode] = useState(null), [m, setM] = useState('');
  const load = () => getDocs(query(collection(db, 'joinCodes'), where('sid', '==', sid))).then((q) => setCode(q.docs[0]?.id || '')).catch(() => setCode(''));
  useEffect(() => { load(); }, [sid]);
  async function gen() {
    try {
      const old = await getDocs(query(collection(db, 'joinCodes'), where('sid', '==', sid))); await Promise.all(old.docs.map((d) => deleteDoc(d.ref)));
      const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', b = crypto.getRandomValues(new Uint8Array(8)), c = [...b].map((x) => A[x % A.length]).join('');
      await setDoc(doc(db, 'joinCodes', c), { sid, createdAt: Date.now() }); setCode(c); setM('');
    } catch { setM('היצירה נכשלה (רק גבאי ראשי יכול ליצור קוד).'); }
  }
  async function off() { try { const old = await getDocs(query(collection(db, 'joinCodes'), where('sid', '==', sid))); await Promise.all(old.docs.map((d) => deleteDoc(d.ref))); setCode(''); setM(''); } catch { setM('הביטול נכשל – בדקו חיבור ונסו שוב.'); } }
  return (<Card fold title="🔗 קוד הצטרפות לגבאי משנה">
    <p style={{ margin: 0, fontSize: 13, color: 'var(--mu)' }}>גבאי משנה נרשם בעצמו עם הקוד ומשויך אוטומטית לבית הכנסת (הרשאת הודעות בלבד) – בלי אישור ידני. אפשר להחליף או לבטל את הקוד בכל רגע.</p>
    {code ? <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 4, direction: 'ltr', margin: '8px 0' }}>{code}</div> : <p>{code === null ? 'טוען…' : 'אין קוד פעיל.'}</p>}
    <div className="row"><button className="b" onClick={gen}>{code ? '🔄 קוד חדש (מבטל את הקודם)' : 'צור קוד'}</button>{code && <button className="b g" onClick={off}>בטל קוד</button>}{code && <button className="b g" onClick={() => navigator.clipboard?.writeText(code)}>העתק</button>}</div>{m && <p style={{ color: 'var(--bad)' }}>{m}</p>}
  </Card>);
}
function PwCard() {
  const [o, setO] = useState(''), [n, setN] = useState(''), [m, setM] = useState('');
  async function go() {
    setM('');
    if (n.length < 8 || !/[A-Za-z\u05d0-\u05ea]/.test(n) || !/\d/.test(n)) return setM('הסיסמה החדשה: 8 תווים לפחות, כולל אות ומספר.');
    try { const u = auth.currentUser; await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, o)); await updatePassword(u, n); setO(''); setN(''); setM('הסיסמה עודכנה ✓'); }
    catch (e) { setM(e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' ? 'הסיסמה הנוכחית שגויה.' : 'העדכון נכשל: ' + (e.code || e.message)); }
  }
  return (<Card fold title="🔒 שינוי סיסמה">
    <label>סיסמה נוכחית (או הזמנית שקיבלתם)</label><input type="password" autoComplete="current-password" value={o} onChange={(e) => setO(e.target.value)} />
    <label>סיסמה חדשה</label><input type="password" autoComplete="new-password" value={n} onChange={(e) => setN(e.target.value)} />
    <button className="b" style={{ marginTop: 8 }} onClick={go} disabled={!o || !n}>עדכן סיסמה</button>{m && <p style={{ color: m.includes('✓') ? 'var(--ok,#2e9e5b)' : 'var(--bad)' }}>{m}</p>}
  </Card>);
}
export default function SettingsTab({ ctx: { sid, syn, st, set, screens, cols, track } }) {
  const [msg, setMsg] = useState('');
  const loc = syn.location || { lat: 31.77, lng: 35.21, elevation: 0 };
  const ref = doc(db, 'synagogues', sid);
  async function find(city = syn.city, street = syn.street) {
    if (!city && !street) return; setMsg('מחפש כתובת…');
    try {
      const g = await geocode(city, street);
      if (!g) return setMsg('לא נמצא. בדקו את שם העיר או הזינו קואורדינטות ידנית.');
      if (!(await save({ location: { lat: g.lat, lng: g.lng, elevation: g.elevation || 0 }, locationSource: g.source || '' }))) return setMsg('שמירת המיקום נכשלה – בדקו חיבור/הרשאות ונסו שוב.');
      setMsg('המיקום נשמר: ' + g.source + '. זמני היום חושבו מחדש.');
    } catch { setMsg('החיפוש נכשל – בדקו חיבור לאינטרנט, או הזינו קואורדינטות ידנית.'); } // offline / geocoder down: never an unhandled rejection
  }
  // every write goes through the panel's tracker, so a failure shows in the save chip
  const save = (data) => { try { const p = updateDoc(ref, data); return track ? track(p) : p.then(() => true, () => false); } catch { return Promise.resolve(false); } };
  const num = (e, k) => { const v = e.target.value; if (v === '' || !Number.isFinite(+v)) return; save({ [k]: +v }); }; // an empty / invalid box must never overwrite the coordinates
  const [bk, setBk] = useState('');
  const exportAll = () => {
    const data = { app: 'maor', v: 1, at: new Date().toISOString(), name: syn.name, settings: st, nusach: syn.nusach || null, location: syn.location || null, cols };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = `maor-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setBk('הגיבוי ירד למחשב ✓');
  };
  const importAll = async (file) => {
    if (!file) return;
    let d;
    try { d = JSON.parse(await file.text()); if (d.app !== 'maor' || !d.settings) throw new Error('bad'); } catch { return setBk('קובץ גיבוי לא תקין'); }
    try {
      if (!confirm(`לשחזר גיבוי מתאריך ${String(d.at).slice(0, 10)}? ההגדרות והתכנים הקיימים יידרסו.`)) return;
      setBk('משחזר…');
      await updateDoc(ref, { settings: d.settings, ...(d.nusach ? { nusach: d.nusach } : {}), ...(d.location ? { location: d.location } : {}) });
      for (const [col, items] of Object.entries(d.cols || {})) for (const it of (['announcements', 'memorials', 'refuah', 'sponsors', 'halacha', 'prayers', 'overrides', 'lessons'].includes(col) && Array.isArray(items) ? items : [])) { const { id, ...rest } = it; await setDoc(doc(db, 'synagogues', sid, col, id), rest); }
      setBk('השחזור הושלם ✓');
    } catch (e) { console.error('[maor] restore failed:', e); setBk('השחזור נכשל באמצע – בדקו חיבור/הרשאות ונסו שוב (ייתכן שחלק מהנתונים כבר שוחזר).'); }
  };
  const online = (id) => { const s = screens.find((x) => x.id === id); return !!s?.lastSeen?.toMillis && Date.now() - s.lastSeen.toMillis() < 100000; };
  return (<>
    <Card title="בית הכנסת">
      <label>שם בית הכנסת</label><TextIn value={syn.name} onSave={(v) => save({ name: v })} />
      <label>עיר</label><TextIn value={syn.city} placeholder="ירושלים" onSave={(v) => { save({ city: v }); find(v, syn.street); }} />
      <label>רחוב ומספר בית</label><TextIn value={syn.street} placeholder="רחוב יפו 10" onSave={(v) => { save({ street: v }); find(syn.city, v); }} />
      <button className="b" style={{ marginTop: 8 }} onClick={() => find()}>מצא קואורדינטות ושמור</button>
      <div style={{ fontSize: 13, color: 'var(--mu)', marginTop: 6 }}>{msg}<br />מיקום נוכחי: {(+loc.lat).toFixed(4)}, {(+loc.lng).toFixed(4)} · גובה {loc.elevation || 0} מ׳ {syn.locationSource && '· ' + syn.locationSource}</div>
      <details><summary style={{ cursor: 'pointer', color: 'var(--mu)' }}>הזנה ידנית (מתקדם)</summary>
        <div className="row"><div><label>קו רוחב</label><input type="number" step=".0001" defaultValue={loc.lat} onBlur={(e) => num(e, 'location.lat')} /></div>
          <div><label>קו אורך</label><input type="number" step=".0001" defaultValue={loc.lng} onBlur={(e) => num(e, 'location.lng')} /></div>
          <div><label>גובה (מ׳)</label><input type="number" defaultValue={loc.elevation || 0} onBlur={(e) => num(e, 'location.elevation')} /></div></div></details>
    </Card>
    <Card title="קבוצת וואטסאפ"><label>קישור לקבוצת הווטסאפ של בית הכנסת</label><TextIn value={st.waLink} style={{ direction: 'ltr' }} placeholder="https://chat.whatsapp.com/..." onSave={(v) => set('waLink', v)} /></Card>
    <JoinCard sid={sid} />
    <PwCard />
    <Card fold title="💾 גיבוי ושחזור">
      <div className="mu">קובץ אחד עם כל ההגדרות והתכנים (תפילות, הנצחות, הודעות, שיעורים וכו׳). מומלץ לשמור גיבוי לפני שינויים גדולים.</div>
      <div className="row"><button className="b" onClick={exportAll}>⬇ הורד גיבוי</button><label className="b g" style={{ textAlign: 'center', cursor: 'pointer' }}>⬆ שחזר מקובץ<input type="file" accept="application/json" hidden onChange={(e) => { importAll(e.target.files[0]); e.target.value = ''; }} /></label></div>
      {bk && <div style={{ fontSize: 13 }}>{bk}</div>}
    </Card>
    <Card fold title="מסכים">
      <div style={{ marginBottom: 8 }}><ScreenLink sid={sid} /></div>
      {SCREENS.map((id) => (
        <div className="row" key={id} style={{ fontSize: 13 }}>
          <span style={{ flex: '0 0 14px' }}>{screens.some((s) => s.id === id) ? (online(id) ? '🟢' : '🔴') : '⚪'}</span><b style={{ flex: '1 1 80px' }}>{SCREEN_NAMES[id]}</b>
          <span style={{ flex: '3 1 200px', color: 'var(--mu)', direction: 'ltr' }}>/display?s={sid}&amp;screen={id}</span><ScreenLink sid={sid} screen={id} label="👁️ פתח" />
        </div>))}
      <div className="mu12">פתחו את הכתובת בדפדפן הטלוויזיה (Fully Kiosk). המסך מתחבר בעצמו.</div>
    </Card>
  </>);
}
