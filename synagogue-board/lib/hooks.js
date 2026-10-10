'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, disableNetwork, doc, enableNetwork, getDocFromServer, getDocsFromServer, onSnapshot } from 'firebase/firestore';
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
 * Synagogue data that survives a dead network:
 *  - Firestore persistent cache (IndexedDB) + a localStorage copy => data is shown immediately, even offline.
 *  - status: 'cached' (offline / from cache), 'fallback' (one-time server fetch), 'live' (connected).
 *  - while not connected: one-time server fetch after 4s, then retries + a network "nudge" every 15s and on the
 *    browser 'online' event, so the screen re-syncs by itself when the internet (or a hotspot) comes back.
 */
export function useSynagogue(sid, extra = []) {
  const [state, setState] = useState({ syn: undefined, cols: {}, status: 'loading', error: '' });
  useEffect(() => {
    if (!sid) return;
    let alive = true, fromCache = true;
    const names = [...DISPLAY_COLS, ...extra], KEY = 'syncache:' + sid;
    try { const c = JSON.parse(localStorage.getItem(KEY)); if (c?.syn) setState({ syn: c.syn, cols: c.cols || {}, status: 'cached', error: '' }); } catch {}
    const fetchOnce = async () => {
      try {
        const d = await getDocFromServer(doc(db, 'synagogues', sid));
        if (!alive || !fromCache) return;
        if (!d.exists()) return setState((s) => ({ ...s, syn: null, status: 'fallback' }));
        const cols = {};
        await Promise.all(names.map(async (n) => { cols[n] = (await getDocsFromServer(collection(db, 'synagogues', sid, n))).docs.map((x) => ({ id: x.id, ...x.data() })); }));
        if (alive && fromCache) setState({ syn: { id: d.id, ...d.data() }, cols, status: 'fallback', error: '' });
      } catch (e) { if (alive && fromCache) setState((s) => ({ ...s, status: s.syn ? 'cached' : 'error', error: e.code || String(e) })); }
    };
    const nudge = () => { disableNetwork(db).then(() => enableNetwork(db)).catch(() => {}); };
    const un = [onSnapshot(doc(db, 'synagogues', sid), { includeMetadataChanges: true },
      (s) => { fromCache = s.metadata.fromCache; setState((st) => ({ ...st, syn: s.exists() ? { id: s.id, ...s.data() } : null, status: fromCache ? 'cached' : 'live' })); },
      () => fetchOnce())];
    names.forEach((n) => un.push(onSnapshot(collection(db, 'synagogues', sid, n),
      (q) => setState((st) => ({ ...st, cols: { ...st.cols, [n]: q.docs.map((d) => ({ id: d.id, ...d.data() })) } })), () => {})));
    const first = setTimeout(() => { if (fromCache) fetchOnce(); }, 4000);
    const loop = setInterval(() => { if (fromCache) { nudge(); fetchOnce(); } }, 15000);
    const onOnline = () => { nudge(); fetchOnce(); };
    window.addEventListener('online', onOnline);
    return () => { alive = false; clearTimeout(first); clearInterval(loop); window.removeEventListener('online', onOnline); un.forEach((u) => u()); };
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
