import { HDate, HebrewCalendar } from '@hebcal/core';

const BOOKS = [['II Samuel', 'שמואל ב׳'], ['I Samuel', 'שמואל א׳'], ['II Kings', 'מלכים ב׳'], ['I Kings', 'מלכים א׳'], ['Isaiah', 'ישעיהו'], ['Jeremiah', 'ירמיהו'], ['Ezekiel', 'יחזקאל'],
  ['Hosea', 'הושע'], ['Joel', 'יואל'], ['Amos', 'עמוס'], ['Obadiah', 'עובדיה'], ['Micah', 'מיכה'], ['Habakkuk', 'חבקוק'], ['Zephaniah', 'צפניה'], ['Zechariah', 'זכריה'],
  ['Malachi', 'מלאכי'], ['Joshua', 'יהושע'], ['Judges', 'שופטים'], ['Jonah', 'יונה']];

/** Haftarah reference (Hebrew book names) for the Shabbat with the given rata-die day. '' on holiday Shabbatot. */
export async function haftaraHe(rd) {
  try {
    const { getLeyningForParshaHaShavua } = await import('@hebcal/leyning'); // loaded only when the image maker is used
    const hd = new HDate(rd);
    const ev = HebrewCalendar.calendar({ start: hd, end: hd, sedrot: true, noHolidays: true, il: true }).find((e) => e.getDesc().startsWith('Parashat'));
    if (!ev) return '';
    let s = String(getLeyningForParshaHaShavua(ev, true).haftara || '');
    BOOKS.forEach(([en, he]) => { s = s.split(en).join(he); });
    return s.replace(/(\d)-(\d)/g, '$1–$2');
  } catch { return ''; }
}
