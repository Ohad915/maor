/** Shared (client + server) input validation for the forgot-password flow. */
export const isEmail = (v) => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
/** Digits only; +972 / 00972 / leading 0 are all reduced to the national number (e.g. 0501234567 -> 501234567). */
export const normPhone = (v) => {
  let d = String(v || '').replace(/[^\d+]/g, '');
  d = d.replace(/^\+/, '').replace(/^00/, '');
  if (d.startsWith('972')) d = d.slice(3);
  return d.replace(/^0+/, '');
};
/** Israeli mobile / landline (8-9 digits after the country code) – other countries accepted at 8-12 digits. */
export const isPhone = (v) => { const raw = String(v || '').replace(/[\s\-().]/g, ''); if (!/^\+?\d{8,15}$/.test(raw)) return false; const n = normPhone(v); return n.length >= 8 && n.length <= 12; };

/** Israeli mobile only (05X-XXXXXXX, also +972 5X…): returns the canonical national form 05XXXXXXXX or ''. */
export const ilMobile = (v) => { const n = normPhone(v); return /^5\d{8}$/.test(n) ? '0' + n : ''; };
export const isILMobile = (v) => !!ilMobile(v);
/** Phone + password login without SMS: the phone becomes a deterministic (never mailed) Firebase e-mail identity. */
const PHONE_DOMAIN = '@phone.maor.local';
export const phoneEmail = (v) => { const m = ilMobile(v); return m ? `p${m}${PHONE_DOMAIN}` : ''; };
/** What the user typed in the "phone or e-mail" field -> the Firebase e-mail to sign in with ('' when neither is valid). */
export const loginEmail = (v) => { const t = String(v || '').trim(); return t.includes('@') ? (isEmail(t) ? t.toLowerCase() : '') : phoneEmail(t); };
/** Pretty identifier for admin screens: phone accounts show the phone number, others the e-mail. */
export const showId = (email) => (String(email || '').endsWith(PHONE_DOMAIN) ? String(email).slice(1, -PHONE_DOMAIN.length) : email);
