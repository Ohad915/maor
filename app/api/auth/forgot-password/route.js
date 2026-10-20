import { NextResponse } from 'next/server';
import { isEmail, isPhone, normPhone, ilMobile, phoneEmail } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.FORGOT_PASSWORD_NOTIFY_TO || 'ohad915@gmail.com';
const hits = new Map(); // best-effort rate limit (per server instance): 5 requests / 10 minutes per IP and per email
const limited = (key) => { const now = Date.now(), a = (hits.get(key) || []).filter((t) => now - t < 600000); a.push(now); hits.set(key, a); if (hits.size > 5000) hits.clear(); return a.length > 5; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Looks the user up in Firestore (firebase-admin). Returns true / false, or null when the admin SDK is not configured. */
async function matchUser(email, phone) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const admin = (await import('firebase-admin')).default;
  if (!admin.apps.length) { const sa = JSON.parse(raw); admin.initializeApp({ credential: admin.credential.cert({ ...sa, private_key: String(sa.private_key || '').replace(/\\n/g, '\n') }) }); }
  const want = normPhone(phone);
  if (!email) { // phone-only account: its login identity is derived from the number
    const pe = phoneEmail(phone); if (!pe) return false;
    return !(await admin.firestore().collection('users').where('email', '==', pe).limit(1).get()).empty;
  }
  const snap = await admin.firestore().collection('users').where('email', '==', email).limit(5).get();
  return snap.docs.some((d) => { const p = d.data(); return normPhone(p.phone) === want && want && p.status !== 'rejected'; });
}

/** Standard Firebase password-reset email (sent by Firebase itself via the Identity Toolkit REST API). */
async function sendReset(email) {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) throw new Error('missing api key');
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }) });
  if (!r.ok) throw new Error('reset failed ' + r.status);
}

/** Sends mail through SMTP (nodemailer) when SMTP_* is set, otherwise through Resend (RESEND_API_KEY). */
async function sendMail({ to, subject, html, text }) {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const nm = (await import('nodemailer')).default;
    const tr = nm.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 465), secure: (process.env.SMTP_PORT || '465') === '465', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    return tr.sendMail({ from: process.env.MAIL_FROM || `מאור <${process.env.SMTP_USER}>`, to, subject, html, text });
  }
  if (process.env.RESEND_API_KEY) {
    const r = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM || 'מאור <onboarding@resend.dev>', to: [to], subject, html, text }) });
    if (!r.ok) throw new Error('resend ' + r.status);
    return;
  }
  throw new Error('mail not configured');
}

const mailHtml = (d) => `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;background:#f4efe2;font-family:Arial,Heebo,sans-serif">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3d6b0">
<div style="background:linear-gradient(90deg,#0b1a4d,#1d3590);color:#f6d77a;padding:18px 22px;font-size:20px;font-weight:700">🔑 בקשת איפוס סיסמה – מאור</div>
<div style="padding:20px 22px;color:#222;font-size:15px;line-height:1.7">
<p style="margin:0 0 12px">התקבלה בקשה חדשה ל״שכחתי סיסמה״:</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">
<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#777;width:34%">אימייל</td><td style="padding:8px;border-bottom:1px solid #eee;direction:ltr;text-align:right"><b>${esc(d.email || '— (חשבון טלפון)')}</b></td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#777">טלפון</td><td style="padding:8px;border-bottom:1px solid #eee;direction:ltr;text-align:right"><b>${esc(d.phone)}</b></td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#777">תאריך ושעה</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(d.when)}</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#777">התאמה במסד הנתונים</td><td style="padding:8px;border-bottom:1px solid #eee"><b style="color:${d.match === true ? '#1f7a4d' : d.match === false ? '#b3261e' : '#8a6a1f'}">${esc(d.matchText)}</b></td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#777">מייל איפוס אוטומטי</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(d.resetText)}</td></tr>
<tr><td style="padding:8px;color:#777">כתובת IP</td><td style="padding:8px;direction:ltr;text-align:right">${esc(d.ip)}</td></tr></table>
<p style="margin:14px 0 0;color:#777;font-size:13px">אם לא נמצאה התאמה, ניתן ליצור קשר עם המבקש בטלפון שהוזן ולאמת זהות לפני איפוס ידני.</p>
</div></div></body></html>`;

export async function POST(req) {
  let body; try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'בקשה לא תקינה.' }, { status: 400 }); }
  const email = String(body?.email || '').trim().toLowerCase(), phone = String(body?.phone || '').trim();
  if (body?.website) return NextResponse.json({ ok: true }); // honeypot: bots fill hidden fields, pretend success
  if (email && !isEmail(email)) return NextResponse.json({ ok: false, error: 'כתובת האימייל אינה תקינה.' }, { status: 400 });
  if (!email && !ilMobile(phone)) return NextResponse.json({ ok: false, error: 'מספר הטלפון אינו תקין (לדוגמה 050-1234567).' }, { status: 400 });
  if (!isPhone(phone)) return NextResponse.json({ ok: false, error: 'מספר הטלפון אינו תקין (לדוגמה 050-1234567).' }, { status: 400 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited('ip:' + ip) || limited('em:' + (email || normPhone(phone)))) return NextResponse.json({ ok: false, error: 'נשלחו יותר מדי בקשות. נסו שוב בעוד כמה דקות.' }, { status: 429 });

  let match = null; try { match = await matchUser(email, phone); } catch (e) { console.error('forgot-password: lookup failed', e?.message); }
  let resetText = 'לא נשלח (אין התאמה או אימות לא זמין)', resetOk = false;
  if (match === true && !email) resetText = 'חשבון טלפון – ללא מייל. יש לאפס ידנית: ניהול מערכת ← 🔑 אפס סיסמה, ולמסור את הסיסמה הזמנית בטלפון';
  else if (match === true) { try { await sendReset(email); resetOk = true; resetText = 'נשלח (Firebase sendPasswordResetEmail)'; } catch (e) { console.error('forgot-password: reset failed', e?.message); resetText = 'נכשל בשליחה: ' + (e?.message || ''); } }
  const when = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'full', timeStyle: 'medium' });
  const matchText = match === true ? 'נמצאה רשומה תואמת (אימייל + טלפון)' : match === false ? 'לא נמצאה רשומה תואמת' : 'לא ניתן לאמת (FIREBASE_SERVICE_ACCOUNT לא מוגדר)';
  let mailOk = false;
  try {
    await sendMail({ to: ADMIN_EMAIL, subject: `🔑 בקשת איפוס סיסמה – ${email || phone}`, html: mailHtml({ email, phone, when, ip, match, matchText, resetText }), text: `בקשת איפוס סיסמה\nאימייל: ${email}\nטלפון: ${phone}\nזמן: ${when}\nהתאמה: ${matchText}\nמייל איפוס: ${resetText}\nIP: ${ip}` });
    mailOk = true;
  } catch (e) { console.error('forgot-password: notify failed', e?.message); }
  if (!mailOk && !resetOk) return NextResponse.json({ ok: false, error: 'לא ניתן לשלוח את הבקשה כרגע. נסו שוב מאוחר יותר או פנו למנהל המערכת.' }, { status: 502 });
  // identical answer whether or not an account matched (prevents probing which e-mails/phones are registered)
  return NextResponse.json({ ok: true });
}
