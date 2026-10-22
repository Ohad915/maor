import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { DateTime } from 'luxon';

export const TZ = 'Asia/Jerusalem';
export const fmt = (dt) => (dt ? dt.setZone(TZ).toFormat('HH:mm') : '—');

/** Halachic-custom options from the settings: shma method, tzeit definition, Rabbeinu Tam, visible sunrise. */
export const zOpts = (st) => { const z = st.zm || {}; return { shma: z.shma || st.shma || 'gra', tzeit: z.tzeit || '8.5', rt: !!z.rt, visible: z.netzVisible !== false, method: z.method || 'std', off: z.off || {} }; };

/** Every daily time the display can show. key = id used in settings.zm.bi (visibility) and settings.zm.off (manual minute offset). */
export const ZDEF = [['a', 'עלות השחר'], ['n', 'נץ החמה'], ['s', 'סוף זמן ק״ש'], ['tf', 'סוף זמן תפילה'], ['c', 'חצות היום'], ['mg', 'מנחה גדולה'], ['mk', 'מנחה קטנה'], ['pl', 'פלג המנחה'], ['k', 'שקיעה'], ['t', 'צאת הכוכבים'], ['se', 'צאת השבת'], ['r', 'רבינו תם']];
const ZON = { n: true, s: true, k: true, t: true, r: true }; // shown unless switched off; the new ones are opt-in
export const zOn = (zm, k) => (zm?.bi?.[k] ?? !!ZON[k]);
/** The ordered rows [label, DateTime, key] that the settings ask to show (bottom bar + zmanim slide share this). rtOn: Shabbat / Yom Tov. */
export function zmanimRows(z, st, rtOn) {
  const zm = st.zm || {}, o = zOpts(st), both = o.shma === 'both', R = [];
  for (const [k, l] of ZDEF) {
    if (!zOn(zm, k)) continue;
    if (k === 's') { if (both) R.push(['סוף ק״ש (מג״א)', z.shmaMga, k], ['סוף ק״ש (גר״א)', z.shmaGra, k]); else R.push([l, z.shma, k]); }
    else if (k === 'tf') { if (both) R.push(['סוף תפילה (מג״א)', z.tfilaMga, k], ['סוף תפילה (גר״א)', z.tfilaGra, k]); else R.push([l, o.shma === 'mga' ? z.tfilaMga : z.tfilaGra, k]); }
    else if (k === 'r') { if (rtOn && o.rt) R.push([l, z.rt, k]); }
    else if (k === 'se') { if (rtOn && z.shabEnd) R.push([l, z.shabEnd, k]); }
    else R.push([l, { a: z.alot, n: z.netz, c: z.chatzot, mg: z.minchaGedola, mk: z.minchaKetana, pl: z.plag, k: z.shkia, t: z.tzeit }[k], k]);
  }
  return R.filter((x) => x[1]);
}

/**
 * Daily times from the saved coordinates (kosher-zmanim). Pure local computation: no network needed.
 * tzeit: '8.5' (8.5 degrees), '13.5z' (13.5 zmaniyot minutes), '13.5m' (13.5 regular minutes), '20' | '30' | '40' (minutes after sunset).
 */
export function getZmanim(date, loc, o = {}) {
  if (typeof o === 'string') o = { shma: o };
  const lat = Number.isFinite(parseFloat(loc?.lat)) ? parseFloat(loc.lat) : 31.7683, lng = Number.isFinite(parseFloat(loc?.lng)) ? parseFloat(loc.lng) : 35.2137; // blank/invalid coordinates -> Jerusalem, never the equator
  const geo = new GeoLocation('synagogue', lat, lng, +loc?.elevation || 0, TZ);
  const cal = new ComplexZmanimCalendar(geo);
  const dt = DateTime.fromJSDate(date, { zone: TZ });
  cal.setDate(dt.startOf('day'));
  const shkia = cal.getSeaLevelSunset();
  const tz = { '8.5': () => cal.getTzaisGeonim8Point5Degrees(), '13.5z': () => shkia && shkia.plus({ milliseconds: (cal.getShaahZmanisGra() * 13.5) / 60 }),
    '13.5m': () => shkia && shkia.plus({ minutes: 13.5 }), '20': () => shkia && shkia.plus({ minutes: 20 }), '30': () => shkia && shkia.plus({ minutes: 30 }), '40': () => shkia && shkia.plus({ minutes: 40 }) }[o.tzeit || '8.5'] || (() => cal.getTzaisGeonim8Point5Degrees());
  // method 'oc' (Or HaChaim): alot / Magen Avraham hours counted in 72 *zmaniyot* minutes; 'std': 72 fixed minutes
  const oc = o.method === 'oc', off = o.off || {}, adj = (d, k) => (d && Number(off[k]) ? d.plus({ minutes: Number(off[k]) }) : d); // manual +/- minutes (never on sunrise/sunset: prayer times are derived from them)
  const gra = adj(cal.getSofZmanShmaGRA(), 's'), mga = adj(oc ? cal.getSofZmanShmaMGA72MinutesZmanis() : cal.getSofZmanShmaMGA(), 's');
  if (o.method === 'maor') return maorZmanim(cal, dt, loc, off, o, tz);
  return {
    now: dt, dow: dt.weekday % 7, // 0=Sunday
    netz: o.visible === false ? cal.getSeaLevelSunrise() : cal.getSunrise(), // visible (elevation) sunrise by default
    shkia, shma: o.shma === 'mga' ? mga : gra, shmaGra: gra, shmaMga: mga,
    tzeit: adj(tz(), 't'), rt: adj(cal.getTzais72(), 'r'), chatzot: adj(cal.getChatzos(), 'c'),
    alot: adj(oc ? cal.getAlos72Zmanis() : cal.getAlos72(), 'a'),
    tfilaGra: adj(cal.getSofZmanTfilaGRA(), 'tf'), tfilaMga: adj(oc ? cal.getSofZmanTfilaMGA72MinutesZmanis() : cal.getSofZmanTfilaMGA(), 'tf'),
    minchaGedola: adj(cal.getMinchaGedola(), 'mg'), minchaKetana: adj(cal.getMinchaKetana(), 'mk'), plag: adj(cal.getPlagHamincha(), 'pl'),
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
  return (z.dow === 5 && z.now >= z.shkia.minus({ minutes: candle })) || (z.dow === 6 && z.now < (z.shabEnd || z.tzeit));
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
  if (typeof console !== 'undefined') console.warn('[prayers] no row matched ctx', JSON.stringify(ctx), 'days values:', [...new Set((prayers || []).map((r) => r.days))], '-> weekday fallback:', plain.length);
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


/**
 * "Luach HaMaor" (Or HaChaim) – empirical model fitted to the printed 5787 calendar (Jerusalem, Oct-Nov 2026; every printed minute within ~1.5 min).
 * Base: sunrise from a ~65 m horizon, sunset from a ~680 m horizon (scaled by the synagogue's elevation); everything else derives from those two moments.
 * The constants are empirical (not a published halachic formula) - fine-tune with the manual offsets if a printed day differs.
 */
function maorZmanim(cal0, dt, loc, off, o, tz) {
  const elev = +loc?.elevation || 750, mk = (e) => { const c = new ComplexZmanimCalendar(new GeoLocation('synagogue', cal0.getGeoLocation().getLatitude(), cal0.getGeoLocation().getLongitude(), e, TZ)); c.setDate(dt.startOf('day')); return c; };
  const n = mk((elev * 65) / 750).getSunrise(), s = mk((elev * 680) / 750).getSunset();
  const adj = (d, k) => (d && Number(off[k]) ? d.plus({ minutes: Number(off[k]) }) : d);
  if (!n || !s) return { now: dt, dow: dt.weekday % 7, netz: n, shkia: s };
  const M = (d, m) => d.plus({ milliseconds: m * 60000 }), L = (s.toMillis() - n.toMillis()) / 60000, mid = M(n, L / 2), hr = L / 12;
  const shmaGra = M(n, L / 4 - 3.3), shmaMga = M(n, -72 + (3 * (L + 144)) / 12), tfGra = M(n, L / 3 - 2.9), tfMga = M(n, -72 + (4 * (L + 144)) / 12);
  return {
    now: dt, dow: dt.weekday % 7, netz: n, shkia: s,
    alot: adj(M(n, -1.296 * hr), 'a'),
    shma: o.shma === 'mga' ? adj(shmaMga, 's') : adj(shmaGra, 's'), shmaGra: adj(shmaGra, 's'), shmaMga: adj(shmaMga, 's'),
    tfilaGra: adj(tfGra, 'tf'), tfilaMga: adj(tfMga, 'tf'),
    chatzot: adj(M(mid, -0.6), 'c'), minchaGedola: adj(M(mid, 29.3), 'mg'), minchaKetana: adj(M(n, (9.5 * L) / 12 + 0.7), 'mk'), plag: adj(M(s, 13.3 - (1.25 * L) / 12), 'pl'),
    tzeit: adj(M(s, 13.49), 't'), shabEnd: adj(M(s, 31), 'se'), rt: adj(M(s, (1.0291 * (L + 144)) / 12), 'r'),
  };
}
