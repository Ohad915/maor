'use client';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export function useDoc(path) {
  const [d, setD] = useState(undefined);
  useEffect(() => {
    if (!db || !path) return;
    return onSnapshot(doc(db, ...path.split('/')), (s) => setD(s.exists() ? s.data() : null), () => setD(null));
  }, [path]);
  return d;
}
export function useCol(path) {
  const [d, setD] = useState([]);
  useEffect(() => {
    if (!db || !path) return;
    return onSnapshot(collection(db, ...path.split('/')), (s) => setD(s.docs.map((x) => ({ id: x.id, ...x.data() }))), () => setD([]));
  }, [path]);
  return d;
}
export const useSynagogue = (id) => useDoc(id ? `synagogues/${id}` : null);
export const useOps = (id) => useDoc(id ? `synagogues/${id}/private/ops` : null);
// עדכון שדות לפי נתיב-נקודות, למשל save(id, {'config.layout':'2'})
export const saveSyn = (id, patch) => updateDoc(doc(db, 'synagogues', id), patch);
export const saveOps = (id, patch) => setDoc(doc(db, 'synagogues', id, 'private', 'ops'), patch, { merge: true });
