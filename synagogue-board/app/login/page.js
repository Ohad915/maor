'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { isEmail, isPhone } from '@/lib/validate';

const WAIT = 'חשבונך ממתין לאישור מנהל המערכת. נשלח לך עדכון ברגע שהחשבון יאושר.';

export default function Login() {
  const r = useRouter();
  const [mode, setMode] = useState('in'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState(''), [phone, setPhone] = useState(''), [busy, setBusy] = useState(false), [ok, setOk] = useState(''), [hp, setHp] = useState(''), [wait, setWait] = useState(0);

  const go = (m) => { setMode(m); setMsg(''); setOk(''); };
  async function forgot(e) {
    e.preventDefault(); setMsg(''); setOk('');
    if (!isEmail(email)) return setMsg('כתובת האימייל אינה תקינה.');
    if (!isPhone(phone)) return setMsg('מספר הטלפון אינו תקין (לדוגמה 050-1234567).');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), phone: phone.trim(), website: hp }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) setMsg(j.error || 'אירעה שגיאה. נסו שוב.');
      else { setOk('הבקשה נשלחה בהצלחה ✓ אם הפרטים תואמים לחשבון קיים, יישלח אליכם מייל לאיפוס הסיסמה (בדקו גם בתיקיית הספאם). בכל מקרה מנהל המערכת קיבל את בקשתכם.'); setWait(30); const t = setInterval(() => setWait((w) => { if (w <= 1) { clearInterval(t); return 0; } return w - 1; }), 1000); }
    } catch { setMsg('אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.'); }
    setBusy(false);
  }
  async function submit(e) {
    e.preventDefault(); setMsg('');
    try {
      if (mode === 'up') {
        if (!isPhone(phone)) return setMsg('נא להזין מספר טלפון תקין (משמש גם לשחזור סיסמה).');
        const c = await createUserWithEmailAndPassword(auth, email, pw);
        // new gabbai: pending, no synagogue until the super admin approves
        await setDoc(doc(db, 'users', c.user.uid), { uid: c.user.uid, email, role: 'gabbai', status: 'pending', synagogueId: null, phone: phone.trim(), createdAt: serverTimestamp() });
        await signOut(auth); setMode('in'); return setMsg(WAIT);
      }
      const c = await signInWithEmailAndPassword(auth, email, pw);
      const p = (await getDoc(doc(db, 'users', c.user.uid))).data();
      if (!p || p.status === 'pending') { await signOut(auth); return setMsg(WAIT); }
      if (p.status !== 'approved') { await signOut(auth); return setMsg('החשבון נדחה או הוקפא. פנו למנהל המערכת.'); }
      r.replace(p.role === 'super_admin' ? '/super-admin' : '/admin');
    } catch (err) { setMsg('שגיאה: ' + (err.code || err.message)); }
  }
  if (mode === 'forgot') return (
    <div className="w" style={{ maxWidth: 420 }}>
      <h1>שכחתי סיסמה</h1>
      <form className="cd" onSubmit={forgot} noValidate style={{ position: 'relative' }}>
        <p style={{ margin: '0 0 8px', color: 'var(--mu)', fontSize: 14 }}>הזינו את האימייל והטלפון שבהם נרשמתם. אם הפרטים תואמים, יישלח אליכם קישור לאיפוס הסיסמה.</p>
        <label>אימייל</label><input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
        <label>טלפון</label><input type="tel" inputMode="tel" autoComplete="tel" placeholder="050-1234567" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={busy} style={{ direction: 'ltr', textAlign: 'right' }} />
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={(e) => setHp(e.target.value)} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, padding: 0, border: 0, clipPath: 'inset(50%)', pointerEvents: 'none' }} />
        <button className="b" style={{ width: '100%', marginTop: 10 }} disabled={busy || wait > 0}>{busy ? 'שולח…' : wait > 0 ? `אפשר לשלוח שוב בעוד ${wait} שנ׳` : 'שלח בקשה'}</button>
        <div aria-live="polite">{msg && <p role="alert" style={{ color: 'var(--bad)' }}>{msg}</p>}
          {ok && <p style={{ background: '#1f7a4d', color: '#fff', padding: '10px 12px', borderRadius: 8, fontWeight: 700, lineHeight: 1.5 }}>{ok}</p>}</div>
      </form>
      <button className="b g" onClick={() => go('in')}>← חזרה לכניסה</button>
    </div>);
  return (
    <div className="w" style={{ maxWidth: 420 }}>
      <h1>{mode === 'in' ? 'כניסת גבאים' : 'הרשמת גבאי חדש'}</h1>
      <form className="cd" onSubmit={submit}>
        <label>אימייל</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>סיסמה</label><input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
        {mode === 'up' && <><label>טלפון (לשחזור סיסמה ויצירת קשר)</label><input type="tel" inputMode="tel" autoComplete="tel" placeholder="050-1234567" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ direction: 'ltr', textAlign: 'right' }} /></>}
        <button className="b" style={{ width: '100%', marginTop: 10 }}>{mode === 'in' ? 'כניסה' : 'הרשמה'}</button>
        {msg && <p style={{ color: 'var(--bad)' }}>{msg}</p>}
        {mode === 'in' && <button type="button" className="b g" style={{ width: '100%', marginTop: 8 }} onClick={() => go('forgot')}>שכחת סיסמה?</button>}
      </form>
      <button className="b g" onClick={() => go(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'אין חשבון? הרשמה' : 'יש חשבון? כניסה'}</button>
    </div>);
}
