'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DISPLAY_COLS } from './types';

/** Signed-in user + users/{uid} profile. */
export function useProfile() {
  const [s, set] = useState({ loading: true, user: null, profile: null });
  useEffect(() => {
    let off = () => {};
    const un = onAuthStateChanged(auth, (user) => {
      off();
      if (!user) return set({ loading: false, user: null, profile: null });
      off = onSnapshot(doc(db, 'users', user.uid), (d) => set({ loading: false, user, profile: d.exists() ? d.data() : null }));
    });
    return () => { un(); off(); };
  }, []);
  return s;
}
/**
 * Live synagogue data with a safety net for blocked WebSockets:
 * 1) shows the last cached copy immediately, 2) if no live answer within 4s does a one-time getDoc/getDocs,
 * 3) keeps retrying in the background every 30s until the live listener answers.
 */
export function useSynagogue(sid, extra = []) {
  const [state, setState] = useState({ syn: undefined, cols: {}, status: 'loading', error: '' });
  useEffect(() => {
    if (!sid) return;
    let alive = true, live = false;
    const names = [...DISPLAY_COLS, ...extra], KEY = 'syncache:' + sid;
    try { const c = JSON.parse(localStorage.getItem(KEY)); if (c?.syn) setState({ syn: c.syn, cols: c.cols || {}, status: 'cached', error: '' }); } catch {}
    const fetchOnce = async () => {
      try {
        const d = await getDoc(doc(db, 'synagogues', sid));
        if (!alive || live) return;
        if (!d.exists()) return setState((s) => ({ ...s, syn: null, status: 'fallback' }));
        const cols = {};
        await Promise.all(names.map(async (n) => { cols[n] = (await getDocs(collection(db, 'synagogues', sid, n))).docs.map((x) => ({ id: x.id, ...x.data() })); }));
        if (alive && !live) setState({ syn: { id: d.id, ...d.data() }, cols, status: 'fallback', error: '' });
      } catch (e) { if (alive && !live) setState((s) => ({ ...s, status: s.syn ? 'cached' : 'error', error: e.code || String(e) })); }
    };
    const un = [onSnapshot(doc(db, 'synagogues', sid), (s) => { live = true; setState((st) => ({ ...st, syn: s.exists() ? { id: s.id, ...s.data() } : null, status: 'live' })); }, () => fetchOnce())];
    names.forEach((n) => un.push(onSnapshot(collection(db, 'synagogues', sid, n),
      (q) => { live = true; setState((st) => ({ ...st, status: 'live', cols: { ...st.cols, [n]: q.docs.map((d) => ({ id: d.id, ...d.data() })) } })); }, () => {})));
    const t = setTimeout(() => { if (!live) fetchOnce(); }, 4000);
    const poll = setInterval(() => { if (!live) fetchOnce(); }, 30000);
    return () => { alive = false; clearTimeout(t); clearInterval(poll); un.forEach((u) => u()); };
  }, [sid]); // eslint-disable-line
  useEffect(() => {
    if (state.syn && (state.status === 'live' || state.status === 'fallback')) { try { localStorage.setItem('syncache:' + sid, JSON.stringify({ syn: state.syn, cols: state.cols })); } catch {} }
  }, [state, sid]);
  return state;
}
export function useCol(sid, name) {
  const [rows, set] = useState([]);
  useEffect(() => {
    if (!sid) return;
    return onSnapshot(collection(db, 'synagogues', sid, name), (q) => set(q.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [sid, name]);
  return rows;
}
