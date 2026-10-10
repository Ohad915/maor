import { HDate, HebrewCalendar, Locale, flags } from '@hebcal/core';

// [key, hebrew label, hebcal month number]. Chronological order.
export const MONTHS = [['Tishri', 'תשרי', 7], ['Heshvan', 'חשוון', 8], ['Kislev', 'כסלו', 9], ['Tevet', 'טבת', 10], ['Shevat', 'שבט', 11],
  ['Adar I', 'אדר א׳', 12], ['Adar', 'אדר', 12], ['Adar II', 'אדר ב׳', 13], ['Nisan', 'ניסן', 1], ['Iyar', 'אייר', 2], ['Sivan', 'סיוון', 3],
  ['Tamuz', 'תמוז', 4], ['Av', 'אב', 5], ['Elul', 'אלול', 6]];
export const monthName = (k) => (MONTHS.find((m) => m[0] === k) || [0, k])[1];
const ord = (k) => MONTHS.findIndex((m) => m[0] === k);

export function gem(n) {
  let o = '';
  const H = ['', 'ק', 'ר', 'ש'], T = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], U = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  while (n >= 400) { o += 'ת'; n -= 400; }
  o += H[Math.floor(n / 100)]; n %= 100;
  if (n === 15) o += 'טו'; else if (n === 16) o += 'טז'; else o += T[Math.floor(n / 10)] + U[n % 10];
  return o.length > 1 ? o.slice(0, -1) + '״' + o.slice(-1) : o + '׳';
}

const civil = (d) => {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d).forEach((x) => (p[x.type] = x.value));
  return { y: +p.year, m: +p.month - 1, d: +p.day };
};
export const rdOf = (date, add = 0) => { const c = civil(date); return Math.floor(Date.UTC(c.y, c.m, c.d + add) / 864e5) + 719163; };

/** Current Hebrew date; after sunset the Hebrew day advances. */
export function hebOf(date, afterSunset) {
  const hd = new HDate(rdOf(date, afterSunset ? 1 : 0)), m = hd.getMonth();
  const raw = m === 12 ? (hd.isLeapYear() ? 'Adar I' : 'Adar') : m === 13 ? 'Adar II' : MONTHS.find((x) => x[2] === m)[0];
  return { d: hd.getDate(), raw, y: hd.getFullYear(), hd };
}
export const hmatch = (k, h) => k === h.raw || (k === 'Adar' && h.raw === 'Adar II') || (k === 'Adar II' && h.raw === 'Adar');

export function hAbs(d, key, y) {
  const lp = HDate.isLeapYear(y);
  const M = key === 'Adar' ? (lp ? 13 : 12) : key === 'Adar I' ? 12 : key === 'Adar II' ? (lp ? 13 : 12) : MONTHS.find((x) => x[0] === key)[2];
  return new HDate(Math.min(d, HDate.daysInMonth(M, y)), M, y).abs();
}
export const nowAbs = (h) => hAbs(h.d, h.raw, h.y);

/** Annual Hebrew day/month range (wraps over year end). */
export function inRange(f, t, h) {
  const x = h.d + ord(h.raw) * 100, a = f.d + ord(f.m) * 100, b = t.d + ord(t.m) * 100;
  return a <= b ? x >= a && x <= b : x >= a || x <= b;
}
/** One-time span resolved to absolute days (so expired entries disappear by themselves). */
export function resolveSpan(f, t, h) {
  const n = nowAbs(h);
  for (const y of [h.y - 1, h.y, h.y + 1]) {
    const s = hAbs(f.d, f.m, y); let e = hAbs(t.d, t.m, y);
    if (e < s) e = hAbs(t.d, t.m, y + 1);
    if (e >= n) return { hs: s, he: e };
  }
  return { hs: 0, he: 0 };
}
export const refuahOn = (r, h) => !r.hs || (nowAbs(h) >= r.hs && nowAbs(h) <= r.he);
export const memOn = (m, h) => (m.mode === 'p' ? true : m.mode === 'r' ? inRange(m.from, m.to, h) : m.d === h.d && hmatch(m.month, h));
export const annOn = (a, h) => (a.limited ? inRange(a.from, a.to, h) : true);

const G = (n) => { try { return Locale.gettext(n, 'he-x-NoNikud'); } catch { return n; } };
/** Parsha (or holiday Shabbat) for the upcoming Shabbat, plus special Shabbatot (Shekalim, Zachor, ...). */
export function parshaInfo(date, dow, afterTzeit) {
  const ahead = dow === 6 && afterTzeit ? 7 : (6 - dow + 7) % 7;
  const hd = new HDate(rdOf(date, ahead));
  const x = HebrewCalendar.getSedra(hd.getFullYear(), true).lookup(hd);
  const sp = (HebrewCalendar.getHolidaysOnDate(hd, true) || []).filter((e) => e.getFlags() & flags.SPECIAL_SHABBAT).map((e) => e.render('he-x-NoNikud'));
  return { title: x.chag ? G(x.parsha[0]) : 'פרשת ' + x.parsha.map(G).join('־'), sp };
}
export function holNames(date, afterSunset) {
  const hd = new HDate(rdOf(date, afterSunset ? 1 : 0));
  return (HebrewCalendar.getHolidaysOnDate(hd, true) || []).map((e) => e.render('he-x-NoNikud')).slice(0, 3);
}
const MO12 = ['Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul'];
/** Prayer customs of the day, derived from the Hebrew date only. */
export function reminders(h) {
  const r = [], k = h.raw.startsWith('Adar') ? 'Adar' : h.raw, o = MO12.indexOf(k), x = o * 100 + h.d;
  if ((h.d === 1 && k !== 'Tishri') || h.d === 30) r.push('ראש חודש: יעלה ויבוא · הלל · אין תחנון');
  if (k === 'Tishri' && h.d <= 10) r.push('עשרת ימי תשובה: המלך הקדוש · זכרנו');
  if ((k === 'Kislev' && h.d >= 25) || (k === 'Tevet' && h.d <= 2)) r.push('חנוכה: על הנסים · הלל');
  if ((h.raw === 'Adar' || h.raw === 'Adar II') && h.d === 14) r.push('פורים: על הנסים');
  if (k === 'Tishri' && h.d >= 15 && h.d <= 23) r.push('יעלה ויבוא בתפילה ובברכת המזון', 'הלל שלם');
  r.push(x >= 22 && x <= 614 ? 'אומרים "משיב הרוח ומוריד הגשם"' : 'אומרים "מוריד הטל"');
  r.push(x >= 107 && x <= 614 ? 'אומרים "ותן טל ומטר לברכה"' : 'אומרים "ותן ברכה"');
  return r;
}
