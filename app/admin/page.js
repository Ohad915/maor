'use client';
import { useEffect, useRef, useState } from 'react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { setSetting } from '@/lib/db';
import { useCol, useProfile, useSynagogue } from '@/lib/hooks';
import { DEFAULT_SETTINGS } from '@/lib/types';
import ContentTab from './tabs/ContentTab';
import DesignTab from './tabs/DesignTab';
import BillingTab from './tabs/BillingTab';
import OpsTab from './tabs/OpsTab';
import SettingsTab from './tabs/SettingsTab';
import ErrorBoundary from '@/components/ErrorBoundary';
import PreviewModal from './components/PreviewModal';

const TABS = [['content', '🖥️', 'תוכן המסך'], ['design', '🎨', 'עיצוב ותצוגה'], ['fin', '💳', 'גבייה וחברים'], ['ops', '🛠️', 'תחזוקה ותקציב'], ['sys', '⚙️', 'הגדרות מערכת']];

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
  if (loading || q === undefined || (!asSuper && !asGabbai)) return <p className="msg">בודק הרשאה…</p>;
  return <Panel sid={asSuper ? q : profile.synagogueId} role={asSuper ? 'gabbai' : profile.role} superMode={asSuper} />;
}

function Panel({ sid, role, superMode }) {
  const r = useRouter();
  const { syn, cols, status, error } = useSynagogue(sid);
  const screens = useCol(sid, 'screens');
  const [tab, setTab] = useState('content'), [pv, setPv] = useState(false), [sv, setSv] = useState('idle'), [qs, setQs] = useState(''), hist = useRef([]), [hn, setHn] = useState(0);
  // find-as-you-type: hides admin cards that do not contain the text (re-applied when the tab or the DOM changes)
  useEffect(() => {
    const root = document.querySelector('.admin-root .w'); if (!root) return;
    const q = qs.trim();
    // word-stem match: "שיעור תורה" also finds "שיעורי תורה"; every word must appear
    const toks = q.split(/\s+/).filter(Boolean).map((t) => (t.length > 3 ? t.slice(0, -1) : t));
    const match = (txt) => toks.every((t) => txt.includes(t));
    let hits = 0;
    const run = () => { hits = 0; root.querySelectorAll('.cd').forEach((c) => {
      if (c.parentElement?.closest('.cd')) return;
      const hit = !q || match(c.textContent); c.style.display = hit ? '' : 'none'; if (hit) hits++;
      if (c.tagName === 'DETAILS' && q && hit && !c.open) c.open = true;
    });
    // nothing in this view: jump to the content sub-tab whose name matches
    if (q && !hits) { const pill = [...root.querySelectorAll('.pills button')].find((b) => match(b.textContent) && !b.classList.contains('on')); if (pill) pill.click(); } };
    run(); if (!q) return;
    const mo = new MutationObserver(() => { mo.disconnect(); run(); mo.observe(root, { childList: true, subtree: true }); });
    mo.observe(root, { childList: true, subtree: true }); return () => mo.disconnect();
  }, [qs, tab]);
  useEffect(() => { setQs(''); }, [tab]);
  // security: sign out after 30 minutes without activity (admin pages can change what the whole congregation sees)
  const [idleWarn, setIdleWarn] = useState(false);
  useEffect(() => {
    let last = Date.now(); const bump = () => { last = Date.now(); setIdleWarn(false); };
    const ev = ['pointerdown', 'keydown', 'touchstart', 'scroll']; ev.forEach((e) => addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => { const idle = Date.now() - last; if (idle > 30 * 60000) { signOut(auth).then(() => r.replace('/login')); } else if (idle > 28 * 60000) setIdleWarn(true); }, 15000);
    return () => { ev.forEach((e) => removeEventListener(e, bump)); clearInterval(t); };
  }, []); // eslint-disable-line
  if (syn === undefined) return <p className="msg">{status === 'error' ? `אין חיבור לשרת – ממתין לנתונים… ${error || ''}` : 'טוען…'}</p>;
  if (syn === null) return <p className="msg">{status === 'live' ? 'בית הכנסת לא נמצא.' : 'אין חיבור לשרת – ממתין לנתונים…'}</p>; // from the offline cache an empty answer only means "not downloaded yet"
  if (syn.suspended && !superMode) {
    return (<div className="w"><div className="cd"><h2>⏸ החשבון מושהה</h2><p>הגישה לניהול בית הכנסת הוקפאה על ידי מנהל המערכת. לפרטים פנו אליו.</p>
      <button className="b g" onClick={() => signOut(auth).then(() => r.replace('/login'))}>יציאה</button></div></div>);
  }
  const st = { ...DEFAULT_SETTINGS, ...syn.settings };
  const plan = syn.plan || { planTier: 'basic', maxScreens: 1, features: {} };
  const feat = (k) => !!plan.features?.[k];
  const getp = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  /**
   * Tracks ANY Firestore write (settings, list items, ...) in the "saving / saved / error" chip. Resolves true when the write is acknowledged OR
   * (offline) when it is still queued after 2.5s - Firestore keeps it and syncs it later; false only when the server rejects it.
   * Forms use it: true = clear the form, false = keep what the person typed and tell them.
   */
  const track = (p) => new Promise((res) => {
    setSv('saving'); let done = false, late = false;
    const t = setTimeout(() => { if (!done) { late = true; setSv((x) => (x === 'saving' ? 'queued' : x)); res(true); } }, 2500);
    Promise.resolve(p).then(() => { done = true; clearTimeout(t); setSv('ok'); setTimeout(() => setSv((x) => (x === 'ok' ? 'idle' : x)), 2200); res(true); },
      (e) => { done = true; clearTimeout(t); console.error('[maor] save failed:', e?.code || '', e?.message || e); setSv('err'); if (late) alert('השמירה נכשלה – בדקו חיבור/הרשאות ונסו שוב'); res(false); });
  });
  const write = (p, v) => track(v === undefined ? updateDoc(doc(db, 'synagogues', sid), { [`settings.${p}`]: deleteField() }) : setSetting(sid, p, v));
  const setW = (p, v) => { const last = hist.current[hist.current.length - 1]; if (!(last && last.p === p && Date.now() - last.t < 4000)) { hist.current.push({ p, old: getp(st, p), t: Date.now() }); if (hist.current.length > 40) hist.current.shift(); setHn(hist.current.length); } else last.t = Date.now(); return write(p, v); };
  const undo = () => { const h = hist.current.pop(); setHn(hist.current.length); if (h) write(h.p, h.old); };
  const ctx = { sid, syn, st, cols, role, feat, screens, set: setW, track };
  const online = screens.filter((s) => s.lastSeen?.toMillis && Date.now() - s.lastSeen.toMillis() < 4 * 60000); // the TV beats once every 3 minutes
  const left0 = plan.validUntil ? Math.ceil((new Date(plan.validUntil) - Date.now()) / 864e5) : null, left = Number.isFinite(left0) ? left0 : null;
  const sub = role === 'sub_gabbai';
  return (
    <div className="admin-root">
      <div className="w">
        {superMode && <div className="plan info"><span>🛡 מצב Super Admin: שליטה מלאה ב״{syn.name}״</span><button className="b g" onClick={() => r.push('/super-admin')}>← חזרה לניהול מערכת</button></div>}
        {syn.suspended && <div className="plan bad">⏸ בית הכנסת מושהה (הגבאי חסום, המסך מציג הודעת השהיה)</div>}
        <div className="plan"><span>⭐ חבילת {{ basic: 'בסיס', pro: 'PRO', premium: 'פרימיום' }[plan.planTier]}</span>
          <span>{online.length} מתוך {plan.maxScreens >= 99 ? '∞' : plan.maxScreens} מסכים פעילים{online.length > plan.maxScreens && ' ⚠'}</span>
          <span>{left === null ? 'ללא הגבלת זמן' : left >= 0 ? `${left} ימי מנוי נותרו` : 'המנוי פג'}</span></div>
        {idleWarn && <div className="plan bad">⏳ אין פעילות – תנותקו אוטומטית בעוד דקה. לחצו על המסך כדי להישאר מחוברים.</div>}
        <div className="top"><h1>ניהול · {syn.name}</h1><div className="row" style={{ flex: '0 0 auto' }}>
          {sv !== 'idle' && <span className={`svchip ${sv}`}>{sv === 'saving' ? 'שומר…' : sv === 'ok' ? 'נשמר ✓' : sv === 'queued' ? 'ממתין לחיבור – יישמר אוטומטית' : 'שגיאת שמירה – בדקו חיבור'}</span>}
          {hn > 0 && <button className="b g" type="button" title="בטל את השינוי האחרון" onClick={undo}>↶ בטל ({hn})</button>}
          <button className="b g" type="button" title="תצוגה מקדימה של המסך" onClick={() => setPv(true)}>👁 תצוגה מקדימה</button>
          {!superMode && <button className="b g" onClick={() => signOut(auth).then(() => r.replace('/login'))}>יציאה</button>}</div></div>
        <input className="srch" type="search" placeholder="🔍 חיפוש הגדרה (למשל: רפואה, כותרת, סרגל)…" value={qs} onChange={(e) => setQs(e.target.value)} />
        <ErrorBoundary admin key={sub ? 'content' : tab}>
          {(sub || tab === 'content') && <ContentTab ctx={ctx} />}
          {!sub && tab === 'design' && <DesignTab ctx={ctx} />}
          {!sub && tab === 'fin' && <BillingTab ctx={ctx} />}
          {!sub && tab === 'ops' && <OpsTab ctx={ctx} />}
          {!sub && tab === 'sys' && <SettingsTab ctx={ctx} />}
        </ErrorBoundary>
      </div>
      {!sub && <div className="nav">{TABS.map(([id, ic, l]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><b>{ic}</b>{l}</button>)}</div>}
      {pv && <PreviewModal sid={sid} onClose={() => setPv(false)} />}
    </div>);
}
