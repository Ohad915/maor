import { HDate, HebrewCalendar } from '@hebcal/core';

const BOOKS = [['II Samuel', 'שמואל ב׳'], ['I Samuel', 'שמואל א׳'], ['II Kings', 'מלכים ב׳'], ['I Kings', 'מלכים א׳'], ['Isaiah', 'ישעיהו'], ['Jeremiah', 'ירמיהו'], ['Ezekiel', 'יחזקאל'],
  ['Hosea', 'הושע'], ['Joel', 'יואל'], ['Amos', 'עמוס'], ['Obadiah', 'עובדיה'], ['Micah', 'מיכה'], ['Habakkuk', 'חבקוק'], ['Zephaniah', 'צפניה'], ['Zechariah', 'זכריה'],
  ['Malachi', 'מלאכי'], ['Joshua', 'יהושע'], ['Judges', 'שופטים'], ['Jonah', 'יונה']];

const REASON = { 'Machar Chodesh': 'מחר חודש', 'Shabbat Shekalim': 'שקלים', 'Shabbat Zachor': 'זכור', 'Shabbat Parah': 'פרה', 'Shabbat HaChodesh': 'החודש', 'Shabbat HaGadol': 'הגדול' };

/**
 * Haftarah for the Shabbat with the given rata-die day, by custom (Sephardic reading when it differs).
 * Returns the book name only (no chapter/verse numbers) unless withVerses. '' on holiday Shabbatot.
 */
export async function haftaraHe(rd, nusach = 'ashkenaz', withVerses = false) {
  try {
    const { getLeyningForParshaHaShavua } = await import('@hebcal/leyning'); // separate chunk, loaded on demand
    const hd = new HDate(rd);
    const ev = HebrewCalendar.calendar({ start: hd, end: hd, sedrot: true, noHolidays: true, il: true }).find((e) => e.getDesc().startsWith('Parashat'));
    if (!ev) return '';
    const l = getLeyningForParshaHaShavua(ev, true);
    let s = String((nusach !== 'ashkenaz' && l.sephardic) || l.haftara || '');
    BOOKS.forEach(([en, he]) => { s = s.split(en).join(he); });
    if (!withVerses) s = s.replace(/\s*\d[\d:,\-–; ]*/g, ' ').replace(/\s+/g, ' ').trim();
    // special Shabbat (e.g. the eve of Rosh Chodesh): "מחר חודש (שמואל א׳)", as in the sample poster
    const tag = REASON[Object.keys(REASON).find((k) => String(l.reason?.haftara || l.reason?.haftara_sephardic || '').includes(k) || String(ev.getDesc()).includes(k)) || ''];
    return tag && s ? `${tag} (${s})` : s;
  } catch { return ''; }
}
