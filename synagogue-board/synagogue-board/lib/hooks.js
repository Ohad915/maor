'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
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
/** Live synagogue doc + all display collections. */
export function useSynagogue(sid, extra = []) {
  const [syn, setSyn] = useState(undefined), [cols, setCols] = useState({});
  useEffect(() => {
    if (!sid) return;
    const un = [onSnapshot(doc(db, 'synagogues', sid), (s) => setSyn(s.exists() ? { id: s.id, ...s.data() } : null))];
    [...DISPLAY_COLS, ...extra].forEach((n) => un.push(onSnapshot(collection(db, 'synagogues', sid, n),
      (q) => setCols((c) => ({ ...c, [n]: q.docs.map((d) => ({ id: d.id, ...d.data() })) })))));
    return () => un.forEach((u) => u());
  }, [sid]); // eslint-disable-line
  return { syn, cols };
}
export function useCol(sid, name) {
  const [rows, set] = useState([]);
  useEffect(() => {
    if (!sid) return;
    return onSnapshot(collection(db, 'synagogues', sid, name), (q) => set(q.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [sid, name]);
  return rows;
}
