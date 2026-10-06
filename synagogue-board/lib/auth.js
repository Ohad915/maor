'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const Ctx = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [s, setS] = useState({ user: null, profile: null, loading: true });
  useEffect(() => {
    if (!auth) return;
    let unsubP = () => {};
    const unsub = onAuthStateChanged(auth, (user) => {
      unsubP();
      if (!user) return setS({ user: null, profile: null, loading: false });
      unsubP = onSnapshot(doc(db, 'users', user.uid), (d) => setS({ user, profile: d.exists() ? d.data() : null, loading: false }));
    });
    return () => { unsub(); unsubP(); };
  }, []);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}

// הרשמת גבאי חדש: נוצר חשבון + מסמך משתמש במצב "ממתין לאישור"
export async function registerGabbai(email, password) {
  const c = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', c.user.uid), { uid: c.user.uid, email, role: 'gabbai', status: 'pending', synagogueId: null, createdAt: serverTimestamp() });
  return c.user;
}
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
