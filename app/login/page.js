'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const WAIT = 'חשבונך ממתין לאישור מנהל המערכת. נשלח לך עדכון ברגע שהחשבון יאושר.';

export default function Login() {
  const r = useRouter();
  const [mode, setMode] = useState('in'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault(); setMsg('');
    try {
      if (mode === 'up') {
        const c = await createUserWithEmailAndPassword(auth, email, pw);
        // new gabbai: pending, no synagogue until the super admin approves
        await setDoc(doc(db, 'users', c.user.uid), { uid: c.user.uid, email, role: 'gabbai', status: 'pending', synagogueId: null, createdAt: serverTimestamp() });
        await signOut(auth); setMode('in'); return setMsg(WAIT);
      }
      const c = await signInWithEmailAndPassword(auth, email, pw);
      const p = (await getDoc(doc(db, 'users', c.user.uid))).data();
      if (!p || p.status === 'pending') { await signOut(auth); return setMsg(WAIT); }
      if (p.status !== 'approved') { await signOut(auth); return setMsg('החשבון נדחה או הוקפא. פנו למנהל המערכת.'); }
      r.replace(p.role === 'super_admin' ? '/super-admin' : '/admin');
    } catch (err) { setMsg('שגיאה: ' + (err.code || err.message)); }
  }
  return (
    <div className="w" style={{ maxWidth: 420 }}>
      <h1>{mode === 'in' ? 'כניסת גבאים' : 'הרשמת גבאי חדש'}</h1>
      <form className="cd" onSubmit={submit}>
        <label>אימייל</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>סיסמה</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
        <button className="b" style={{ width: '100%', marginTop: 10 }}>{mode === 'in' ? 'כניסה' : 'הרשמה'}</button>
        {msg && <p style={{ color: 'var(--bad)' }}>{msg}</p>}
      </form>
      <button className="b g" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>{mode === 'in' ? 'אין חשבון? הרשמה' : 'יש חשבון? כניסה'}</button>
    </div>);
}
