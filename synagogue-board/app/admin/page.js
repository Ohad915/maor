'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setSetting } from '@/lib/db';
import { useCol, useProfile, useSynagogue } from '@/lib/hooks';
import { DEFAULT_SETTINGS, SCREENS } from '@/lib/types';
import ScreenTab from './tabs/ScreenTab';
import BillingTab from './tabs/BillingTab';
import { BudgetTab, MaintenanceTab } from './tabs/OpsTab';
import SettingsTab from './tabs/SettingsTab';

const TABS = [['scr', '🖥️', 'מסך ראשי'], ['fin', '💰', 'גבייה'], ['mnt', '🔧', 'תחזוקה'], ['bud', '📊', 'תקציב'], ['set', '⚙️', 'הגדרות']];

/** Gabbai panel. Access: approved users with a synagogueId only. */
export default function Admin() {
  const r = useRouter(), { loading, profile } = useProfile();
  const ok = profile && profile.status === 'approved' && profile.synagogueId && ['gabbai', 'sub_gabbai'].includes(profile.role);
  useEffect(() => { if (!loading && !ok) r.replace('/login'); }, [loading, ok, r]);
  if (!ok) return <p style={{ padding: 20 }}>בודק הרשאה…</p>;
  return <Panel profile={profile} />;
}

function Panel({ profile }) {
  const sid = profile.synagogueId, role = profile.role, r = useRouter();
  const { syn, cols } = useSynagogue(sid);
  const screens = useCol(sid, 'screens');
  const [tab, setTab] = useState('scr'), [pv, setPv] = useState(true);
  if (!syn) return <p style={{ padding: 20 }}>טוען…</p>;
  const st = { ...DEFAULT_SETTINGS, ...syn.settings };
  const plan = syn.plan || { planTier: 'basic', maxScreens: 1, features: {} };
  const feat = (k) => !!plan.features?.[k];
  const ctx = { sid, syn, st, cols, role, feat, screens, set: (p, v) => setSetting(sid, p, v) };
  const online = screens.filter((s) => s.lastSeen && Date.now() - s.lastSeen.toMillis() < 100000);
  const left = plan.validUntil ? Math.ceil((new Date(plan.validUntil) - Date.now()) / 864e5) : null;
  const k = Math.min(1, (typeof innerWidth === 'number' ? innerWidth : 700) - 30) / 1280;
  const sub = role === 'sub_gabbai';
  return (
    <div className="admin-root">
      <div className="w">
        <div className="plan"><span>⭐ חבילת {{ basic: 'בסיס', pro: 'PRO', premium: 'פרימיום' }[plan.planTier]}</span>
          <span>{online.length} מתוך {plan.maxScreens >= 99 ? '∞' : plan.maxScreens} מסכים פעילים{online.length > plan.maxScreens && ' ⚠'}</span>
          <span>{left === null ? 'ללא הגבלת זמן' : left >= 0 ? `${left} ימי מנוי נותרו` : 'המנוי פג'}</span></div>
        <div className="top"><h1>ניהול · {syn.name}</h1><div className="row" style={{ flex: '0 0 auto' }}>
          <button className="b g" onClick={() => setPv(!pv)}>{pv ? 'הסתר תצוגה' : 'תצוגה מקדימה חיה'}</button>
          <button className="b g" onClick={() => signOut(auth).then(() => r.replace('/login'))}>יציאה</button></div></div>
        {pv && !sub && tab === 'scr' && (
          <div className="pvx" style={{ width: 1280 * k, height: 720 * k }}><iframe title="live" src={`/display?s=${sid}&screen=${st.screen || SCREENS[0]}`} style={{ transform: `scale(${k})` }} /></div>)}
        {(sub || tab === 'scr') && <ScreenTab ctx={ctx} />}
        {!sub && tab === 'fin' && <BillingTab ctx={ctx} />}
        {!sub && tab === 'mnt' && <MaintenanceTab ctx={ctx} />}
        {!sub && tab === 'bud' && <BudgetTab ctx={ctx} />}
        {!sub && tab === 'set' && <SettingsTab ctx={ctx} />}
      </div>
      {!sub && <div className="nav">{TABS.map(([id, ic, l]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><b>{ic}</b>{l}</button>)}</div>}
    </div>);
}
