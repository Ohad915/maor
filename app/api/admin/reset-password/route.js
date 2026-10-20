import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Super-admin only: sets a new temporary password for a user (used for phone + password accounts, which have no e-mail to reset by). */
async function adminSdk() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT; if (!raw) return null;
  const admin = (await import('firebase-admin')).default;
  if (!admin.apps.length) { const sa = JSON.parse(raw); admin.initializeApp({ credential: admin.credential.cert({ ...sa, private_key: String(sa.private_key || '').replace(/\\n/g, '\n') }) }); }
  return admin;
}
const tempPassword = () => { const L = 'abcdefghjkmnpqrstuvwxyz', U = 'ABCDEFGHJKMNPQRSTUVWXYZ', D = '23456789', all = L + U + D, pick = (s) => s[randomInt(s.length)]; const a = [pick(L), pick(U), pick(D), ...Array.from({ length: 7 }, () => pick(all))]; for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.join(''); };

export async function POST(req) {
  try {
    const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!tok) return NextResponse.json({ ok: false, error: 'לא מורשה.' }, { status: 401 });
    const admin = await adminSdk();
    if (!admin) return NextResponse.json({ ok: false, error: 'השרת לא מוגדר (FIREBASE_SERVICE_ACCOUNT חסר ב-Vercel).' }, { status: 503 });
    const caller = await admin.auth().verifyIdToken(tok);
    const me = (await admin.firestore().doc(`users/${caller.uid}`).get()).data();
    if (!me || me.role !== 'super_admin' || me.status !== 'approved') return NextResponse.json({ ok: false, error: 'לא מורשה.' }, { status: 403 });
    let body; try { body = await req.json(); } catch { body = {}; }
    const uid = String(body?.uid || ''); if (!/^[A-Za-z0-9]{10,64}$/.test(uid)) return NextResponse.json({ ok: false, error: 'משתמש לא תקין.' }, { status: 400 });
    const password = tempPassword();
    await admin.auth().updateUser(uid, { password });
    await admin.auth().revokeRefreshTokens(uid); // kicks out any existing session of that user
    return NextResponse.json({ ok: true, password });
  } catch (e) { console.error('reset-password failed', e?.message); return NextResponse.json({ ok: false, error: 'האיפוס נכשל.' }, { status: 500 }); }
}
