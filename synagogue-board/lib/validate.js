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
