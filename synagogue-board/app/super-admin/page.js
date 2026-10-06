'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useProfile } from '@/lib/hooks';
import { DEFAULT_SETTINGS, PLAN_PRESETS, defaultPlan } from '@/lib/types';

/** Only for role === 'super_admin'. Approve gabbaim, attach synagogues, manage plans. */
export default function SuperAdmin() {
  const r = useRouter(), { loading, profile } = useProfile();
  const [users, setUsers] = useState([]), [syns, setSyns] = useState([]), [name, setName] = useState('');
  const ok = profile?.role === 'super_admin' && profile.status === 'approved';
  useEffect(() => { if (!loading && !ok) r.replace('/login'); }, [loading, ok, r]);
  useEffect(() => {
    if (!ok) return;
    const a = onSnapshot(collection(db, 'users'), (q) => setUsers(q.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const b = onSnapshot(collection(db, 'synagogues'), (q) => setSyns(q.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { a(); b(); };
  }, [ok]);
  if (!ok) return <p style={{ padding: 20 }}>בודק הרשאה…</p>;

  const setUser = (u, data) => updateDoc(doc(db, 'users', u.id), data);
  const addSyn = async () => {
    if (!name.trim()) return;
    await addDoc(collection(db, 'synagogues'), { name, city: '', street: '', nusach: 'sefard', location: { lat: 31.7683, lng: 35.2137, elevation: 0 }, plan: defaultPlan('basic'), settings: DEFAULT_SETTINGS, createdAt: Date.now() });
    setName('');
  };
  const setPlan = (s, patch) => updateDoc(doc(db, 'synagogues', s.id), { plan: { ...s.plan, ...patch } });
  const setTier = (s, t) => setPlan(s, { planTier: t, ...PLAN_PRESETS[t] });
  const sorted = [...users].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1));

  return (
    <div className="w" style={{ maxWidth: 980 }}>
      <div className="top"><h1>ניהול מערכת (Super Admin)</h1><button className="b g" onClick={() => signOut(auth).then(() => r.replace('/login'))}>יציאה</button></div>

      <h3>משתמשים ובקשות הרשמה</h3>
      {sorted.map((u) => (
        <div className="cd row" key={u.id}>
          <div style={{ flex: '2 1 200px' }}><b>{u.email}</b><div style={{ fontSize: 12, color: 'var(--mu)' }}>{u.role}</div></div>
          <span className={`tag ${u.status === 'approved' ? 'ok' : u.status === 'pending' ? '' : 'bad'}`}>{u.status}</span>
          {u.role !== 'super_admin' && <>
            <select value={u.synagogueId || ''} onChange={(e) => setUser(u, { synagogueId: e.target.value || null })}>
              <option value="">— בית כנסת —</option>{syns.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={u.role} onChange={(e) => setUser(u, { role: e.target.value })}><option value="gabbai">גבאי ראשי</option><option value="sub_gabbai">גבאי משנה</option></select>
            <button className="b" style={{ flex: '0 0 auto' }} disabled={!u.synagogueId} onClick={() => setUser(u, { status: 'approved' })}>אשר</button>
            <button className="b g" style={{ flex: '0 0 auto' }} onClick={() => setUser(u, { status: 'suspended' })}>הקפא</button>
            <button className="b d" style={{ flex: '0 0 auto' }} onClick={() => setUser(u, { status: 'rejected' })}>דחה</button>
          </>}
        </div>))}

      <h3>בתי כנסת וחבילות</h3>
      <div className="cd row"><input placeholder="שם בית כנסת חדש" value={name} onChange={(e) => setName(e.target.value)} /><button className="b" style={{ flex: '0 0 auto' }} onClick={addSyn}>הוסף</button></div>
      {syns.map((s) => {
        const p = s.plan || defaultPlan();
        return (
          <div className="cd" key={s.id}>
            <b>{s.name}</b> <span style={{ fontSize: 12, color: 'var(--mu)' }}>({s.id})</span>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>כתובת מסך: /display?s={s.id}&amp;screen=main-hall</div>
            <div className="row">
              <div><label>חבילה</label><select value={p.planTier} onChange={(e) => setTier(s, e.target.value)}><option value="basic">basic</option><option value="pro">pro</option><option value="premium">premium</option></select></div>
              <div><label>מסכים מורשים</label><input type="number" min="1" value={p.maxScreens} onChange={(e) => setPlan(s, { maxScreens: +e.target.value })} /></div>
              <div><label>תוקף</label><input type="date" value={p.validUntil || ''} onChange={(e) => setPlan(s, { validUntil: e.target.value || null })} /></div>
              <div><label>סטטוס מנוי</label><select value={p.subscriptionStatus} onChange={(e) => setPlan(s, { subscriptionStatus: e.target.value })}><option value="trial">trial</option><option value="active">active</option><option value="expired">expired</option></select></div>
            </div>
            <div className="row">{[['whatsappBot', 'בוט וואטסאפ'], ['customPaymentGateway', 'סליקה'], ['runningTicker', 'סרגל נע'], ['unlimitedMemorials', 'הנצחות ללא הגבלה']].map(([k, l]) => (
              <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={!!p.features?.[k]} onChange={(e) => setPlan(s, { features: { ...p.features, [k]: e.target.checked } })} />{l}</label>))}</div>
          </div>);
      })}
    </div>);
}
