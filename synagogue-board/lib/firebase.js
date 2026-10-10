import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'missing-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing-project',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const auth = getAuth(app);

// Streamers / old WebViews often block WebSockets. Auto-detect falls back to long polling by itself;
// open the display once with ?lp=1 (remembered on the device, ?lp=0 clears it) or set
// NEXT_PUBLIC_FORCE_LONG_POLLING=1 to force long polling from the start.
let force = process.env.NEXT_PUBLIC_FORCE_LONG_POLLING === '1';
try {
  if (typeof window !== 'undefined') {
    const lp = new URLSearchParams(location.search).get('lp');
    if (lp === '1') localStorage.setItem('forceLP', '1');
    if (lp === '0') localStorage.removeItem('forceLP');
    if (localStorage.getItem('forceLP') === '1') force = true;
  }
} catch {}
const net = force ? { experimentalForceLongPolling: true } : { experimentalAutoDetectLongPolling: true };
let _db;
try {
  // Offline persistence: every document read is kept in IndexedDB (works across tabs) and served when the network is gone.
  const canPersist = typeof window !== 'undefined' && 'indexedDB' in window;
  _db = initializeFirestore(app, canPersist ? { ...net, localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) } : net);
} catch {
  try { _db = initializeFirestore(app, net); } catch { _db = getFirestore(app); } // already initialised (hot reload) / persistence unsupported
}
export const db = _db;
