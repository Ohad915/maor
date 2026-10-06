'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setSetting } from '@/lib/db';
import { useCol, useProfile, useSynagogue } from '@/lib/hooks';
import { DEFAULT_SETTINGS } from '@/lib/types';
import ScreenTab from './tabs/ScreenTab';
import BillingTab from './tabs/BillingTab';
import { BudgetTab, MaintenanceTab } from './tabs/OpsTab';
import SettingsTab from './tabs/SettingsTab';
import PreviewModal from './components/PreviewModal';

const TABS = [['scr', '🖥️', 'מסך ראשי'], ['fin', '💰', 'גבייה'], ['mnt', '🔧', 'תחזוקה'], ['bud', '📊', 'תקציב'], ['set', '⚙️', 'הגדרות']];

/**
 * Gabbai panel. Access: approved gabbai/sub-gabbai with a synagogueId,
 * or a super admin entering a synagogue via /admin?s=<id> ("enter as gabbai", full control).
 */
export default function Admin() {
  const r = useRouter(), { loading, profile } = useProfile();
  const [q, setQ] = useState(undefined);
  useEffect(() => { setQ(new URLSearchParams(location.search).get('s')); }, []);
  const asSuper = profile?.role === 'super_admin' && profile.status === 'approved' && !!q;
  const asGabbai = profile && profile.status === 'approved' && profile.synagogueId && ['gabbai', 'sub_gabbai'].includes(profile.role);
  useEffect(() => { if (!loading && q !== undefined && !asSuper && !asGabbai) r.replace(profile?.role === 'super_admin' ? '/super-admin' : '/login'); }, [loading, q, asSuper, asGabbai, profile, r]);
  if (loading || q === undefined || (!asSuper && !asGabbai)) return <p style={{ padding: 20 }}>בודק הרשאה…</p>;
  return <Panel sid={asSuper ? q : profile.synagogueId} role={asSuper ? 'gabbai' : profile.role} superMode={asSuper} />;
}

function Panel({ sid, role, superMode }) {
  const r = useRouter();
  const { syn, cols } = useSynagogue(sid);
  const screens = useCol(sid, 'screens');
  const [tab, setTab] = useState('scr'), [pv, setPv] = useState(false);
  if (syn === undefined) return <p style={{ padding: 20 }}>טוען…</p>;
  if (syn === null) return <p style={{ padding: 20 }}>בית הכנסת לא נמצא.</p>;
  if (syn.suspended && !superMode) {
    return (<div className="w"><div className="cd"><h2>⏸ החשבון מושהה</h2><p>הגישה לניהול בית הכנסת הוקפאה על ידי מנהל המערכת. לפרטים פנו אליו.</p>
      <button className="b g" onClick={() => signOut(auth).then(() => r.replace('/login'))}>יציאה</button></div></div>);
  }
  const st = { ...DEFAULT_SETTINGS, ...syn.settings };
  const plan = syn.plan || { planTier: 'basic', maxScreens: 1, features: {} };
  const feat = (k) => !!plan.features?.[k];
  const ctx = { sid, syn, st, cols, role, feat, screens, set: (p, v) => setSetting(sid, p, v) };
  const online = screens.filter((s) => s.lastSeen && Date.now() - s.lastSeen.toMillis() < 100000);
  const left = plan.validUntil ? Math.ceil((new Date(plan.validUntil) - Date.now()) / 864e5) : null;
  const sub = role === 'sub_gabbai';
  return (
    <div className="admin-root">
      <div className="w">
        {superMode && <div className="plan" style={{ background: '#1f3a8a', color: '#fff' }}><span>🛡 מצב Super Admin: שליטה מלאה ב״{syn.name}״</span><button className="b g" style={{ color: '#fff' }} onClick={() => r.push('/super-admin')}>← חזרה לניהול מערכת</button></div>}
        {syn.suspended && <div className="plan" style={{ background: 'var(--bad)', color: '#fff' }}>⏸ בית הכנסת מושהה (הגבאי חסום, המסך מציג הודעת השהיה)</div>}
        <div className="plan"><span>⭐ חבילת {{ basic: 'בסיס', pro: 'PRO', premium: 'פרימיום' }[plan.planTier]}</span>
          <span>{online.length} מתוך {plan.maxScreens >= 99 ? '∞' : plan.maxScreens} מסכים פעילים{online.length > plan.maxScreens && ' ⚠'}</span>
          <span>{left === null ? 'ללא הגבלת זמן' : left >= 0 ? `${left} ימי מנוי נותרו` : 'המנוי פג'}</span></div>
        <div className="top"><h1>ניהול · {syn.name}</h1><div className="row" style={{ flex: '0 0 auto' }}>
          <button className="b" onClick={() => setPv(true)}>תצוגה מקדימה</button>
          {!superMode && <button className="b g" onClick={() => signOut(auth).then(() => r.replace('/login'))}>יציאה</button>}</div></div>
        {(sub || tab === 'scr') && <ScreenTab ctx={ctx} />}
        {!sub && tab === 'fin' && <BillingTab ctx={ctx} />}
        {!sub && tab === 'mnt' && <MaintenanceTab ctx={ctx} />}
        {!sub && tab === 'bud' && <BudgetTab ctx={ctx} />}
        {!sub && tab === 'set' && <SettingsTab ctx={ctx} />}
      </div>
      {!sub && <div className="nav">{TABS.map(([id, ic, l]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><b>{ic}</b>{l}</button>)}</div>}
      {pv && <PreviewModal sid={sid} onClose={() => setPv(false)} />}
    </div>);
}
