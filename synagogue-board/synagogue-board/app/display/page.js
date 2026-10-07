'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Display from '@/components/Display';

const Msg = ({ children }) => <div className="dp" style={{ width: '100vw', height: '100vh' }}><p style={{ margin: 'auto', textAlign: 'center' }}>{children}</p></div>;

/** Public TV screen: /display?s=<synagogueId>&screen=main-hall  (anonymous sign-in; never stays blank) */
export default function DisplayPage() {
  const [ready, setReady] = useState(false), [q, setQ] = useState(null);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setQ({ sid: p.get('s'), screen: p.get('screen') || 'main-hall' });
    let done = false;
    const un = onAuthStateChanged(auth, (u) => { if (u) { done = true; setReady(true); } else signInAnonymously(auth).catch(() => {}); });
    const t = setTimeout(() => { if (!done) setReady(true); }, 5000); // continue anyway after 5s
    const retry = setInterval(() => { if (!auth.currentUser) signInAnonymously(auth).catch(() => {}); }, 10000);
    return () => { un(); clearTimeout(t); clearInterval(retry); };
  }, []);
  if (!q || !ready) return <Msg>מתחבר…</Msg>;
  if (!q.sid) return <Msg>חסר מזהה בית כנסת בכתובת (?s=...)</Msg>;
  return <div style={{ width: '100vw', height: '100vh' }}><Display sid={q.sid} screenId={q.screen} /></div>;
}
