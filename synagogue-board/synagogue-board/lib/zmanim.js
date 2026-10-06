import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { DateTime } from 'luxon';

export const TZ = 'Asia/Jerusalem';
export const fmt = (dt) => (dt ? dt.setZone(TZ).toFormat('HH:mm') : '—');

/** Daily times from saved coordinates (kosher-zmanim). Sunset is sea-level, sunrise elevation-adjusted. */
export function getZmanim(date, loc, shma = 'gra') {
  const geo = new GeoLocation('synagogue', +loc.lat, +loc.lng, +loc.elevation || 0, TZ);
  const cal = new ComplexZmanimCalendar(geo);
  const dt = DateTime.fromJSDate(date, { zone: TZ });
  cal.setDate(dt.startOf('day'));
  return {
    now: dt,
    dow: dt.weekday % 7, // 0=Sunday
    netz: cal.getSunrise(),
    shkia: cal.getSeaLevelSunset(),
    shma: shma === 'mga' ? cal.getSofZmanShmaMGA() : cal.getSofZmanShmaGRA(),
    tzeit: cal.getTzaisGeonim8Point5Degrees(),
    chatzot: cal.getChatzos(),
  };
}

/** Exact-minute prayer time: fixed "HH:MM", or minutes relative to sunset/sunrise. No rounding. */
export function prayerTime(rule, z) {
  if (rule.mode === 'fixed') return rule.val;
  const base = rule.mode === 'sunset' ? z.shkia : z.netz;
  return base ? fmt(base.plus({ minutes: Number(rule.val) || 0 })) : '—';
}

export function isShabbat(z, candle, force) {
  if (force) return true;
  if (!z.shkia || !z.tzeit) return false;
  return (z.dow === 5 && z.now >= z.shkia.minus({ minutes: candle })) || (z.dow === 6 && z.now < z.tzeit);
}
export const dayType = (sh, dow) => (sh ? 'shab' : dow === 5 ? 'fri' : dow === 6 ? 'mots' : 'week');
