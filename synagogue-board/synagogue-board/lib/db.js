import { addDoc, collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
export const colRef = (sid, name) => collection(db, 'synagogues', sid, name);
export const addItem = (sid, name, data) => addDoc(colRef(sid, name), { ...data, createdAt: Date.now() });
export const updItem = (sid, name, id, data) => updateDoc(doc(db, 'synagogues', sid, name, id), data);
export const delItem = (sid, name, id) => deleteDoc(doc(db, 'synagogues', sid, name, id));
/** Update a nested settings value, e.g. setSetting(sid,'cf.ann.secs',12). */
export const setSetting = (sid, path, val) => updateDoc(doc(db, 'synagogues', sid), { [`settings.${path}`]: val });
export const setPrivate = (sid, name, data) => setDoc(doc(db, 'synagogues', sid, 'private', name), data, { merge: true });
