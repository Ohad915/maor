import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { DateTime } from 'luxon';

export const TZ = 'Asia/Jerusalem';
export const fmt = (dt) => (dt ? dt.setZone(TZ).toFormat('HH:mm') : '—');

/** Halachic-custom options from the settings: shma method, tzeit definition, Rabbeinu Tam, visible sunrise. */
export const zOpts = (st) => { const z = st.zm || {}; return { shma: z.shma || st.shma || 'gra', tzeit: z.tzeit || '8.5', rt: !!z.rt, visible: z.netzVisible !== false }; };

/**
 * Daily times from the saved coordinates (kosher-zmanim). Pure local computation: no network needed.
 * tzeit: '8.5' (8.5 degrees), '13.5z' (13.5 zmaniyot minutes), '20' | '30' | '40' (minutes after sunset).
 */
export function getZmanim(date, loc, o = {}) {
  if (typeof o === 'string') o = { shma: o };
  const geo = new GeoLocation('synagogue', +loc.lat, +loc.lng, +loc.elevation || 0, TZ);
  const cal = new ComplexZmanimCalendar(geo);
  const dt = DateTime.fromJSDate(date, { zone: TZ });
  cal.setDate(dt.startOf('day'));
  const shkia = cal.getSeaLevelSunset();
  const tz = { '8.5': () => cal.getTzaisGeonim8Point5Degrees(), '13.5z': () => shkia && shkia.plus({ milliseconds: (cal.getShaahZmanisGra() * 13.5) / 60 }),
    '20': () => shkia && shkia.plus({ minutes: 20 }), '30': () => shkia && shkia.plus({ minutes: 30 }), '40': () => shkia && shkia.plus({ minutes: 40 }) }[o.tzeit || '8.5'] || (() => cal.getTzaisGeonim8Point5Degrees());
  const gra = cal.getSofZmanShmaGRA(), mga = cal.getSofZmanShmaMGA();
  return {
    now: dt, dow: dt.weekday % 7, // 0=Sunday
    netz: o.visible === false ? cal.getSeaLevelSunrise() : cal.getSunrise(), // visible (elevation) sunrise by default
    shkia, shma: o.shma === 'mga' ? mga : gra, shmaGra: gra, shmaMga: mga,
    tzeit: tz(), rt: cal.getTzais72(), chatzot: cal.getChatzos(),
  };
}

/** Exact-minute prayer time: fixed "HH:MM", or minutes relative to sunset/sunrise. No rounding. */
export function prayerTime(rule, z) {
  const mode = rule.tmode ?? rule.mode;
  if (mode === 'fixed') return rule.val;
  const base = mode === 'sunset' ? z.shkia : z.netz;
  return base ? fmt(base.plus({ minutes: Number(rule.val) || 0 })) : '—';
}

/** True from candle-lighting until tzeit: selects which prayer rows (ערב שבת / שבת / מוצ״ש) apply today. */
export function isShabbat(z, candle, force) {
  if (force && (z.dow === 5 || z.dow === 6)) return true; // manual Shabbat mode only on Fri/Sat; Sun-Thu always follow the real weekday
  if (!z.shkia || !z.tzeit) return false;
  return (z.dow === 5 && z.now >= z.shkia.minus({ minutes: candle })) || (z.dow === 6 && z.now < z.tzeit);
}
export const dayType = (sh, dow) => (sh ? 'shab' : dow === 5 ? 'fri' : dow === 6 ? 'mots' : 'week');

/* ---------- which prayer rows apply TODAY ---------- */
export const PDAYS = { week: 'חול (ראשון–חמישי)', fri: 'ערב שבת / ערב חג', shab: 'שבת', chag: 'חג', mots: 'מוצ״ש', all: 'תמיד / יום יום' };
const PD_ALIAS = { 'חול': 'week', weekday: 'week', sunthu: 'week', 'ערב שבת': 'fri', 'ערב חג': 'fri', erev: 'fri', friday: 'fri', 'שבת': 'shab', shabbat: 'shab', 'חג': 'chag', yomtov: 'chag', holiday: 'chag', 'מוצ״ש': 'mots', 'מוצאי שבת': 'mots', 'תמיד': 'all', 'יום יום': 'all', daily: 'all', always: 'all' };
/** Normalises any stored day-type value (legacy / Hebrew label / missing) to week|fri|shab|chag|mots|all. Missing = every day. */
export const pdayOf = (r) => {
  const v = String(r?.days ?? '').trim(); if (!v) return 'all'; if (PDAYS[v]) return v;
  const l = v.toLowerCase(); if (PD_ALIAS[v] || PD_ALIAS[l]) return PD_ALIAS[v] || PD_ALIAS[l];
  // flexible match: the admin form may store the long Hebrew label, e.g. "חול (ראשון–חמישי)"
  if (v.includes('מוצ')) return 'mots'; if (v.includes('ערב')) return 'fri'; if (v.includes('חול') || /week|sun/.test(l)) return 'week';
  if (v.includes('שבת') || /shab|sat/.test(l)) return 'shab'; if (v.includes('חג') || /chag|holi|yom/.test(l)) return 'chag';
  return 'all';
};
/**
 * Filters prayer rows for today.
 *  ctx = { dt: 'week'|'fri'|'shab'|'mots' (from dayType), dow: 0-6, chag: today is Yom Tov (incl. its eve after candle-lighting), erev: today is an erev-chag day }
 *  Sun–Thu: "חול".  Friday / erev chag: "ערב שבת/ערב חג" + "חול".  Shabbat: "שבת".  Chag: "חג" (+ "שבת" rows that have no "חג" row of the same prayer).
 *  A row with an explicit weekday list (r.dow) is shown on exactly those weekdays. A specific row replaces the generic "חול" row of the same prayer name.
 */
/** Stable sort by admin-defined `order` (rows without one keep their original relative position, after ordered rows). */
export const sortPrayers = (arr) => (arr || []).map((r, i) => [r, i]).sort(([a, i], [b, j]) => ((typeof a.order === 'number' ? a.order : 1e6) - (typeof b.order === 'number' ? b.order : 1e6)) || i - j).map(([r]) => r);
export function getPrayersForToday(prayers, ctx, fw = (r) => String(r.name || '').split(' ')[0]) {
  prayers = sortPrayers(prayers);
  const res = filterPrayers(prayers, ctx, fw);
  if (res.length || !(prayers || []).length) return res;
  // safety net: nothing matched today's special state (forced Shabbat mode, chag detection...) -> fall back to the plain weekday (Sun–Thu = חול, Fri = ערב שבת + חול, Sat = שבת)
  const dow = Number(ctx.dow), plain = filterPrayers(prayers, { dt: dow === 6 ? 'shab' : dow === 5 ? 'fri' : 'week', dow, chag: false, erev: false }, fw);
  if (typeof console !== 'undefined') console.log('Raw prayers from DB:', prayers, 'Current Day Context:', ctx); console.warn('[prayers] no row matched ctx', JSON.stringify(ctx), 'days values:', [...new Set((prayers || []).map((r) => r.days))], '-> weekday fallback:', plain.length);
  return plain;
}
function filterPrayers(prayers, ctx, fw) {
  const { dt, dow, chag = false, erev = false } = ctx, idx = dt === 'shab' && !chag ? 6 : dow;
  const kinds = new Set(['all']);
  if (chag) kinds.add('chag'); else if (dt === 'shab') kinds.add('shab');
  else { kinds.add('week'); if (dt === 'fri' || erev) kinds.add('fri'); if (dt === 'mots') kinds.add('mots'); }
  const hasDow = (r) => Array.isArray(r.dow) && r.dow.length > 0;
  const rows = (prayers || []).filter((r) => (hasDow(r) ? r.dow.includes(idx) : kinds.has(pdayOf(r))));
  const specific = new Set(rows.filter((r) => !hasDow(r) && !['week', 'all'].includes(pdayOf(r))).map(fw));
  return rows.filter((r) => {
    if (hasDow(r)) return true; const k = pdayOf(r);
    if (k === 'week' && specific.has(fw(r))) return false;
    if (chag && k === 'shab' && rows.some((x) => !hasDow(x) && pdayOf(x) === 'chag' && fw(x) === fw(r))) return false;
    return true;
  });
}
