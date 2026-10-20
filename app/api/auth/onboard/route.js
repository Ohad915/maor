import { NextResponse } from 'next/server';
import { DEFAULT_SETTINGS, defaultPlan } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Automatic synagogue linking right after registration (no manual Firestore editing).
 *   { mode:'create', name, city }  -> creates the synagogue, links users/{uid}.synagogueId. Status stays "pending" until the super admin
 *                                      approves (set AUTO_APPROVE_NEW_SYNAGOGUES=1 on the server to approve instantly).
 *   { mode:'join', code }          -> the code (created by the main gabbai) links the user to that synagogue as a sub-gabbai, approved at once.
 * Everything privileged runs here with the Admin SDK; the client only proves who it is with its ID token.
 */
const hits = new Map();
const limited = (k) => { const now = Date.now(), a = (hits.get(k) || []).filter((t) => now - t < 600000); a.push(now); hits.set(k, a); if (hits.size > 5000) hits.clear(); return a.length > 8; };
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

async function adminSdk() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT; if (!raw) return null;
  const admin = (await import('firebase-admin')).default;
  if (!admin.apps.length) { const sa = JSON.parse(raw); admin.initializeApp({ credential: admin.credential.cert({ ...sa, private_key: String(sa.private_key || '').replace(/\\n/g, '\n') }) }); }
  return admin;
}
const fail = (error, status) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req) {
  try {
    const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!tok) return fail('לא מורשה.', 401);
    const admin = await adminSdk();
    if (!admin) return fail('שיוך אוטומטי אינו זמין כרגע – מנהל המערכת ישייך אתכם ידנית.', 503);
    const caller = await admin.auth().verifyIdToken(tok);
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (limited('ip:' + ip) || limited('uid:' + caller.uid)) return fail('יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.', 429);

    const db = admin.firestore(), uref = db.doc(`users/${caller.uid}`);
    const me = (await uref.get()).data();
    if (!me || me.role !== 'gabbai' || me.synagogueId) return fail('החשבון כבר משויך או אינו מתאים.', 409);
    let body; try { body = await req.json(); } catch { body = {}; }

    if (body.mode === 'create') {
      const name = clean(body.name, 80), city = clean(body.city, 60);
      if (name.length < 2) return fail('נא להזין שם בית כנסת.', 400);
      const auto = process.env.AUTO_APPROVE_NEW_SYNAGOGUES === '1';
      const ref = await db.collection('synagogues').add({ name, city, street: '', nusach: 'sefard', location: { lat: 31.7683, lng: 35.2137, elevation: 0 }, plan: defaultPlan('basic'), settings: DEFAULT_SETTINGS, createdAt: Date.now(), createdBy: caller.uid });
      await uref.update({ synagogueId: ref.id, role: 'gabbai', status: auto ? 'approved' : 'pending' });
      return NextResponse.json({ ok: true, status: auto ? 'approved' : 'pending', synagogueId: ref.id });
    }

    if (body.mode === 'join') {
      const code = clean(body.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length < 6) return fail('קוד הצטרפות לא תקין.', 400);
      const c = (await db.doc(`joinCodes/${code}`).get()).data();
      if (!c?.sid) return fail('הקוד שגוי או שאינו בתוקף.', 404);
      const s = (await db.doc(`synagogues/${c.sid}`).get()).data();
      if (!s || s.suspended) return fail('בית הכנסת אינו פעיל.', 403);
      await uref.update({ synagogueId: c.sid, role: 'sub_gabbai', status: 'approved' });
      return NextResponse.json({ ok: true, status: 'approved', synagogueId: c.sid, name: s.name });
    }
    return fail('בקשה לא תקינה.', 400);
  } catch (e) { console.error('onboard failed', e?.message); return fail('הפעולה נכשלה. נסו שוב.', 500); }
}
