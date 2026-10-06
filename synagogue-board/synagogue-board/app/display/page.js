'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Display from '@/components/Display';

/** Public TV screen: /display?s=<synagogueId>&screen=main-hall  (signs in anonymously) */
export default function DisplayPage() {
  const [ready, setReady] = useState(false), [q, setQ] = useState(null);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setQ({ sid: p.get('s'), screen: p.get('screen') || 'main-hall' });
    const un = onAuthStateChanged(auth, (u) => { if (u) setReady(true); else signInAnonymously(auth).catch(() => {}); });
    return un;
  }, []);
  if (!q || !ready) return <p style={{ padding: 20 }}>מתחבר…</p>;
  if (!q.sid) return <p style={{ padding: 20 }}>חסר מזהה בית כנסת בכתובת (?s=...)</p>;
  return <div style={{ width: '100vw', height: '100vh' }}><Display sid={q.sid} screenId={q.screen} /></div>;
}
