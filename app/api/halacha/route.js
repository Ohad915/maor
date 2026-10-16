import { NextResponse } from 'next/server';

/** Daily halacha from Sefaria's open calendar (public-domain texts). Server-side so the TV never hits CORS and Sefaria is called at most every 30 minutes per source. */
const ITEMS = { live_hy: 'Halakhah Yomit', live_ah: 'Arukh HaShulchan Yomi', live_rb: 'Daily Rambam' };
const API = 'https://www.sefaria.org/api';
const clean = (s) => String(s)
  .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;|&thinsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ').trim();
const flat = (x) => (Array.isArray(x) ? x.flatMap(flat) : x == null ? [] : [clean(x)]);

export async function GET(req) {
  const src = new URL(req.url).searchParams.get('src') || 'live_hy';
  const want = ITEMS[src];
  if (!want) return NextResponse.json({ error: 'unknown source' }, { status: 400 });
  try {
    const opt = { next: { revalidate: 1800 }, headers: { Accept: 'application/json' } };
    const cal = await (await fetch(`${API}/calendars?diaspora=0&timezone=Asia/Jerusalem`, opt)).json();
    const it = (cal.calendar_items || []).find((x) => x.title?.en === want);
    if (!it) throw new Error('calendar item not found');
    const tx = await (await fetch(`${API}/v3/texts/${encodeURIComponent(it.ref)}?version=hebrew&return_format=text_only`, opt)).json();
    const v = (tx.versions || [])[0];
    const lines = flat(v?.text).filter(Boolean);
    if (!lines.length) throw new Error('empty text');
    return NextResponse.json({
      title: it.title.he, content: lines.join('\n'), source: `${it.displayValue?.he || tx.heRef || it.ref} · לפי לוח ספריא`, ref: it.ref, date: cal.date,
    }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' } });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 502 });
  }
}
