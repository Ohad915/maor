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
  const mode = rule.mode ?? rule.tmode;
  if (mode === 'fixed') return rule.val;
  const base = mode === 'sunset' ? z.shkia : z.netz;
  return base ? fmt(base.plus({ minutes: Number(rule.val) || 0 })) : '—';
}

/** True from candle-lighting until tzeit: selects which prayer rows (ערב שבת / שבת / מוצ״ש) apply today. */
export function isShabbat(z, candle, force) {
  if (force) return true;
  if (!z.shkia || !z.tzeit) return false;
  return (z.dow === 5 && z.now >= z.shkia.minus({ minutes: candle })) || (z.dow === 6 && z.now < z.tzeit);
}
export const dayType = (sh, dow) => (sh ? 'shab' : dow === 5 ? 'fri' : dow === 6 ? 'mots' : 'week');
