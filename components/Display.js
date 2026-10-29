'use client';
import { Children, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import KeepAlive from '@/lib/keepAlive';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSynagogue } from '@/lib/hooks';
import { dayType, fmt, getPrayersForToday, getZmanim, isShabbat, prayerTime, zOpts, zmanimRows } from '@/lib/zmanim';
import { haftaraHe } from '@/lib/haftara';
import { isLive, pickDaily } from '@/lib/dailyHalacha';
import { annOn, chagInfo, fullName, LESSON_TYPES, lessonDaysLabel, lessonLabel, lessonOn, lessonType, lessonWho, gem, hebOf, holNames, memOn, monthName, parshaInfo, rdOf, refuahOn, reminders } from '@/lib/hebrew';
import { DEFAULT_SETTINGS, FONTS, SCREENS, tbgKeyOf, tbgPath } from '@/lib/types';
import { DEMO_PRAYERS, DEMO_SYN } from '@/lib/defaults';

/* ---------- relative block size (50% = Auto) and per-block colors ---------- */
const bk = (st, k) => { const b = st.blocks?.[k] || {}; return { w: (b.w ?? 50) / 50, h: (b.h ?? 50) / 50, b }; };
function blockStyle(st, k, t, base) {
  const { w, h, b } = bk(st, k), o = {};
  if (t === 'x') { if (w !== 1) { o.width = Math.min(w, 1) * 100 + '%'; o.alignSelf = 'center'; } if (h !== 1) { o.height = `calc(${base * h} * var(--u))`; o.flex = 'none'; o.overflow = 'hidden'; } }
  else if (t === 's') { o.flex = base * h; if (w < 1) { o.width = w * 100 + '%'; o.alignSelf = 'center'; } }
  else if (t === 'r') { o.flex = base * w; if (h < 1) { o.height = h * 100 + '%'; o.alignSelf = 'center'; } }
  if (b.bg) o.background = b.bg;
  if (b.bd) o.borderColor = b.bd;
  if (b.tx) { o.color = b.tx; o['--dac'] = b.tx; }
  return o;
}
/** Royal layout: apply admin box settings (width/height % where 50 = auto, colours) on top of the fixed mockup box. */
function royBox(st, k, l, t, w, h, anchor = 'c', mul = null, force = false) {
  const b = st.blocks?.[k] || {}, lb = b['L' + String(st.layout || '1')] || {}, fw = ((lb.w ?? 50) / 50) * (mul?.w || 1), fh = ((lb.h ?? 50) / 50) * (mul?.h || 1); // size overrides are stored per layout (L1..L4) so one layout's tweaks never break another
  const nw = Math.min(w * fw, 100), nh = Math.min(h * fh, 100);
  const nl = Math.max(0, Math.min(100 - nw, anchor === 'l' ? l : anchor === 'r' ? l + w - nw : l + (w - nw) / 2)), nt = Math.max(0, Math.min(100 - nh, t + (h - nh) / 2));
  const style = { position: 'absolute', left: nl + '%', top: nt + '%', width: nw + '%', height: nh + '%', flex: 'none', alignSelf: 'auto' };
  const cls = [];
  if (b.tx) { style['--ctx'] = b.tx; cls.push('rl-ctx'); }
  const resized = force || Math.abs(fw - 1) > 1e-6 || Math.abs(fh - 1) > 1e-6;
  if (resized) cls.push('rl-sized');
  // the parchment frames are baked into the background image: when a block is resized, hide the baked frame and let the block draw its own
  const ghost = resized ? { position: 'absolute', left: Math.max(0, l - 0.7) + '%', top: Math.max(0, t - 1.2) + '%', width: Math.min(100, w + 1.4) + '%', height: Math.min(100, h + 2.4) + '%' } : null;
  const hide = { position: 'absolute', left: Math.max(0, l - 0.35) + '%', top: Math.max(0, t - 0.8) + '%', width: Math.min(100, w + 0.7) + '%', height: Math.min(100, h + 1.6) + '%' }; // masks the baked frame when the block is switched off
  return { style, cls: cls.join(' '), ghost, hide };
}
/** seconds left on the current carousel slide (next to the progress bar) */
function Cd({ d }) {
  const [n, setN] = useState(Math.ceil(d));
  useEffect(() => { setN(Math.ceil(d)); const t = setInterval(() => setN((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(t); }, [d]);
  return <span className="cdn" aria-hidden="true">{n}</span>;
}
/** Cards stacked in one column (memorial / refuah / QR): when one is enlarged the others move and shrink so they never overlap or leave [lo,hi] (% of the screen). */
function stackCol(items, lo, hi, maxR = 100, gap = 1.2) {
  const a = items.filter(Boolean).map((b) => ({ b, t: parseFloat(b.style.top), h: parseFloat(b.style.height), t0: parseFloat(b.style.top), h0: parseFloat(b.style.height) }));
  if (a.length < 1) return;
  a.forEach((p) => { const l = parseFloat(p.b.style.left), w = parseFloat(p.b.style.width); if (l + w > maxR) { p.b.style.width = Math.max(10, maxR - l) + '%'; if (!/rl-sized/.test(p.b.cls)) p.b.cls = (p.b.cls + ' rl-sized').trim(); } });
  a.sort((x, y) => x.t - y.t);
  const tot = a.reduce((q, p) => q + p.h, 0) + gap * (a.length - 1), k = Math.min(1, (hi - lo - 0.01) / tot);
  if (k < 1) a.forEach((p) => { p.h *= k; });
  for (let i = 0; i < a.length; i++) { const min = i ? a[i - 1].t + a[i - 1].h + gap : lo; if (a[i].t < min) a[i].t = min; }
  for (let i = a.length - 1; i >= 0; i--) { const max = (i === a.length - 1 ? hi : a[i + 1].t - gap) - a[i].h; if (a[i].t > max) a[i].t = max; }
  for (let i = 0; i < a.length; i++) { const min = i ? a[i - 1].t + a[i - 1].h + gap : lo; if (a[i].t < min) a[i].t = min; }
  a.forEach((p) => { if (Math.abs(p.t - p.t0) > 0.01 || Math.abs(p.h - p.h0) > 0.01) { p.b.style.top = p.t + '%'; p.b.style.height = p.h + '%'; if (!/rl-sized/.test(p.b.cls)) p.b.cls = (p.b.cls + ' rl-sized').trim(); if (!p.b.ghost) { p.b.ghost = { position: 'absolute', left: p.b.style.left, top: p.t0 - 1.2 + '%', width: parseFloat(p.b.style.width) + 1.4 + '%', height: p.h0 + 2.4 + '%' }; } } });
}
/** Block whose font scales with its own width (auto responsive scaling). */
function Blk({ st, fs, id, t, b, cls, share = 0.95, mult = 1, fit = true, style, children }) {
  const ref = useRef(null);
  const fm = ((st.blocks?.[id]?.fs ?? st.fsAll ?? 18) / 18) * mult; // per-block text size (12-26, 18 = default)
  useLayoutEffect(() => {
    const e = ref.current; if (!e || !fit) return;
    const run = () => {
      const dp = e.closest('.dp'); if (!dp || !e.clientWidth) return;
      e.style.fontSize = (fs * e.clientWidth / (dp.clientWidth * share)) * fm + 'px';
      const ab = e.querySelector('.ab,.pgw'); // content must never leave its block: shrink until it fits
      if (ab) { let f = parseFloat(e.style.fontSize); for (let i = 0; i < 14 && (ab.scrollHeight > ab.clientHeight + 1 || ab.scrollWidth > ab.clientWidth + 1); i++) { f *= 0.93; e.style.fontSize = f + 'px'; } }
    };
    run(); const ro = new ResizeObserver(run); ro.observe(e); ro.observe(e.closest('.dp'));
    return () => ro.disconnect();
  }, [fs, share, fm, fit, st, children]);
  return <div ref={ref} className={cls} style={{ ...blockStyle(st, id, t, b), ...(fit ? {} : { fontSize: fm + 'em' }), ...style }}>{children}</div>;
}

/** Per-item display mode: 'off' | 'block' (carousel) | 'full' (full screen). Old items fall back to their on/off switch. */
const modeOf = (x) => x.mode ?? (x.on === false ? 'off' : 'block');
const dotStr = (n, i) => (n > 1 ? Array.from({ length: n }, (_, k) => (k === i % n ? '●' : '○')).join(' ') : '');
/** Long text -> pages of at most `cap` lines (keeps the author's line breaks). */
function splitText(text, cap) {
  if (!text) return [''];
  const W = 44, pages = []; let cur = [], used = 0;
  const flush = () => { if (cur.length) pages.push(cur.join('\n')); cur = []; used = 0; };
  for (const line of text.split('\n')) {
    let parts = [line];
    if (line.length > cap * W) { parts = []; let c = ''; for (const w of line.split(' ')) { if ((c + ' ' + w).length > cap * W && c) { parts.push(c); c = w; } else c = c ? c + ' ' + w : w; } parts.push(c); }
    for (const pt of parts) { const wgt = Math.max(1, Math.ceil(pt.length / W)); if (used + wgt > cap && cur.length) flush(); cur.push(pt); used += wgt; }
  }
  flush(); return pages.length ? pages : [''];
}
const chunk = (arr, n, p) => { const pages = Math.max(1, Math.ceil(arr.length / n)); return { pages, items: arr.slice((p % pages) * n, (p % pages) * n + n) }; };

export default function Display({ sid, screenId, fixedSize, preview, authErr }) {
  const live = useSynagogue(sid);
  // TV reliability (real screen only): <KeepAlive/> = wake lock + silent video loop + watchdog/soft refresh; plus one nightly reload at 04:00 Israel time
  useEffect(() => {
    if (preview || typeof window === 'undefined') return;
    const t = setInterval(() => {
      const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
      if (p >= '04:00' && p < '04:05' && navigator.onLine !== false) { const k = 'maor-reload-' + new Date().toISOString().slice(0, 10); try { if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); location.reload(); } } catch {} }
    }, 30000);
    return () => clearInterval(t);
  }, [preview]);
  // no connection / empty or missing document and nothing cached: calm demo board (zmanim are computed locally) instead of a network error
  const offlineNow = typeof navigator !== 'undefined' && !navigator.onLine;
  const demo = !live.syn && (live.syn === null || live.status === 'error' || offlineNow);
  const syn = demo ? DEMO_SYN : live.syn, status = demo ? 'demo' : live.status;
  const cols = { ...live.cols, prayers: live.cols?.prayers?.length ? live.cols.prayers : DEMO_PRAYERS };
  const [now, setNow] = useState(() => new Date());
  const [size, setSize] = useState({ w: 1280, h: 720 });
  useEffect(() => { if (fixedSize) { setSize(fixedSize); return; } const u = () => setSize({ w: innerWidth, h: innerHeight }); u(); addEventListener('resize', u); return () => removeEventListener('resize', u); }, [fixedSize?.w, fixedSize?.h]); // eslint-disable-line
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  if (!syn) return <>{!preview && <KeepAlive />}<div className="dp"><p style={{ margin: 'auto', textAlign: 'center' }}>טוען נתונים…</p></div></>;
  if (syn.suspended) return <>{!preview && <KeepAlive />}<div className="dp"><div style={{ margin: 'auto', textAlign: 'center' }}><h1>⏸ המסך מושהה</h1><p>השירות לבית כנסת זה הושהה זמנית. לפרטים פנו למנהל המערכת.</p></div></div></>;
  return <>{!preview && <KeepAlive />}<Inner syn={syn} cols={cols} screenId={screenId} now={now} size={size} status={status} preview={preview} diag={offlineNow ? '' : (authErr || live.error || '')} authErr={offlineNow ? '' : authErr} /></>;
}

function Inner({ syn, cols, screenId, now, size, status, preview, diag, authErr }) {
  const quiet = (syn?.id !== 'demo' && (status === 'cached' || status === 'fallback')) || (typeof navigator !== 'undefined' && !navigator.onLine); // real data on screen: just a discreet dot, never an error text
  const st = { ...DEFAULT_SETTINGS, ...syn.settings };
  const z = getZmanim(now, syn.location || { lat: 31.77, lng: 35.21 }, zOpts(st));
  const sh = isShabbat(z, st.candle, st.force);
  const h = hebOf(now, !!z.shkia && z.now >= z.shkia);
  const LM = st.layout || '1';
  const fs = (size.h > size.w ? size.w / 52 : Math.min(size.w / 72, size.h / 40)) * st.zoom;
  const CF_BLK = { pr: 'pr', ann: 'mn', hal: 'mn', mem: 'yz', rf: 'rf' }; // component -> owning block (unified admin accordion)
  const cf = (k) => { const a = st.cf || {}, o = a[k] || {}, bo = (st.blocks || {})[CF_BLK[k]] || {}; return { size: 18, ...a.all, ...o, font: bo.font || o.font || a.all?.font || 'david', secs: bo.secs || o.secs || a.all?.secs || 10 }; }; // global (cf.all) < legacy per-component < per-block override
  const afs = (k) => ({ '--af': FONTS[cf(k).font] }); // text size comes from the block (accordion), font from the component
  const onS = (s) => !s || s === 'all' || s === screenId;
  const V = (k) => (st.vis || {})[k] !== false;
  const ipp = (k) => Math.max(1, st.ipp?.[k] || 3);
  const [idx, setIdx] = useState(0);
  const [pg, setPg] = useState({ yz: 0, rf: 0, mr: 0 });
  const [btI, setBtI] = useState(0); // bottom bar carousel page (fixed mode with long text)
  useEffect(() => { const t = setInterval(() => setBtI((i) => i + 1), 5000); return () => clearInterval(t); }, []);

  /* ----- content ----- */
  const pi = parshaInfo(now, z.dow, !!z.tzeit && z.now >= z.tzeit);
  const ptitle = st.pMode === 'manual' && st.pTitle ? st.pTitle : pi.title;
  const tbgKey = tbgKeyOf(st), royal = tbgKey === 'temple' && LM !== '3', tbgSrc = tbgPath(tbgKey), [tbgBad, setTbgBad] = useState('');
  useEffect(() => { // verify the theme image really loads; otherwise warn with the exact missing path and fall back to the plain theme
    if (!tbgSrc || typeof Image === 'undefined') return; const im = new Image();
    im.onload = () => setTbgBad(''); im.onerror = () => { console.warn('Failed to load theme image:', tbgSrc); setTbgBad(tbgSrc); }; im.src = tbgSrc;
  }, [tbgSrc]);
  const tbgOn = tbgKey && tbgBad !== tbgSrc;
  const hfOn = !!st.hfShow && !st.hfText, [haf, setHaf] = useState('');
  useEffect(() => {
    if (!hfOn) { setHaf(''); return; }
    let alive = true; const ah = z.dow === 6 && z.tzeit && z.now >= z.tzeit ? 7 : (6 - z.dow + 7) % 7;
    const rd = rdOf(new Date(+now + ah * 864e5)), key = `haf:${rd}:${syn.nusach}`;
    try { const c = localStorage.getItem(key); if (c !== null) setHaf(c); } catch {}
    haftaraHe(rd, syn.nusach).then((x) => { if (alive) { setHaf(x); try { localStorage.setItem(key, x); } catch {} } });
    return () => { alive = false; };
  }, [hfOn, Math.floor(+now / 36e5), syn.nusach]); // eslint-disable-line
  const hText = st.hfShow ? st.hfText || haf : '';
  const anns = (cols.announcements || []).filter((a) => modeOf(a) !== 'off' && onS(a.screen) && annOn(a, h));
  const mems = (cols.memorials || []).filter((m) => onS(m.screen) && memOn(m, h));
  const refs = (cols.refuah || []).filter((r) => onS(r.screen) && refuahOn(r, h));
  const lessons = (cols.lessons || []).filter((l) => modeOf(l) !== 'off' && onS(l.screen));
  const hal = (cols.halacha || []).filter((x) => modeOf(x) !== 'off' && onS(x.screen));
  const dt = dayType(sh, z.dow);
  const fw = (r) => String(r.name || '').split(' ')[0];
  const rowsToday = getPrayersForToday((cols.prayers || []).filter((r) => onS(r.screen)), { dt, dow: z.dow, ...chagInfo(now, z, st.candle) }, fw);
  const rcm = (h.d === 1 && h.raw !== 'Tishri') || h.d === 30;
  const ovr = (r) => (cols.overrides || []).find((o) => o.prayerId === r.id && (o.kind === 'rc' ? rcm : o.kind === 'h' && o.day === h.d && (o.month === h.raw || (o.month === 'Adar' && h.raw === 'Adar II'))));
  const grp = {};
  const tOf = (r) => ovr(r)?.time || prayerTime(r, z);
  const pa = st.ptAll || { mode: 'off', secs: 10 }, pdur = pa.secs || 10;
  const inBar = (r) => r.bar ?? (r.show ?? 'bar') === 'bar';
  const allGrp = {};
  rowsToday.forEach((r) => { { const g = (allGrp[r.name] ||= { t: [], n: [] }), tt = tOf(r); if (!g.t.includes(tt)) g.t.push(tt); } if (r.note) allGrp[r.name].n.push(r.note); });
  rowsToday.filter(inBar).forEach((r) => { (grp[fw(r)] ||= { t: [], n: [] }); { const tt = tOf(r); if (!grp[fw(r)].t.includes(tt)) grp[fw(r)].t.push(tt); } if (r.note) grp[fw(r)].n.push(r.note); });
  const cMode = st.customs?.mode || 'auto', manual = (st.customs?.text || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const auto = [...holNames(now, !!z.shkia && z.now >= z.shkia), ...reminders(h)];
  const chips = cMode === 'manual' ? manual : cMode === 'both' ? [...auto, ...manual] : auto;

  // live daily halacha (Sefaria via /api/halacha): cached per day in localStorage, built-in library as offline fallback
  const dhDay = rdOf(now, 0), [dhLive, setDhLive] = useState(null);
  useEffect(() => {
    const on = st.dh?.on && st.dh?.mode !== 'off' && isLive(st.dh?.src || 'live_hy') && !String(st.dh?.manual || '').trim();
    if (!on) { setDhLive(null); return; }
    const src = st.dh?.src || 'live_hy', key = `dh:${src}:${dhDay}`; let alive = true;
    try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c?.content) setDhLive(c); else setDhLive(null); } catch { setDhLive(null); }
    fetch(`/api/halacha?src=${src}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => {
      if (!alive || !j?.content) return; setDhLive(j);
      try { Object.keys(localStorage).filter((k) => k.startsWith('dh:') && k !== key).forEach((k) => localStorage.removeItem(k)); localStorage.setItem(key, JSON.stringify(j)); } catch {}
    }).catch(() => {});
    return () => { alive = false; };
  }, [st.dh?.on, st.dh?.mode, st.dh?.src, st.dh?.manual, dhDay]); // eslint-disable-line
  const slides = [];
  if (st.pSlide && V('pr') && !royal) slides.push({ k: 'p', dur: cf('pr').secs });
  anns.forEach((a) => slides.push({ k: 'a', a, full: modeOf(a) === 'full', dur: cf('ann').secs }));
  // sponsor of the week / blessing of the year: carousel slide with its own duration (up to 30s)
  (cols.sponsors || []).filter((x) => onS(x.screen) && refuahOn(x, h) && (x.mode || 'block') !== 'off').forEach((x) => {
    const ttl = x.kind === 'bracha' ? 'ברכת השנה' : x.kind === 'other' ? x.title || 'הקדשה' : 'פרנס השבוע';
    slides.push({ k: 'a', a: { id: 'sp-' + x.id, label: '🏅 ' + ttl, title: fullName(x), content: [x.text, x.blessing].filter((v) => v && String(v).trim()).join('\n') }, full: x.mode === 'full', dur: Math.min(30, Math.max(5, +x.secs || 20)) });
  });
  if (V('memPop') && !royal) mems.filter((m) => (!m.mode || m.mode === 'y')).forEach((m) => slides.push({ k: 'm', m, dur: cf('mem').secs }));
  if (V('rf') && V('rfPop') && refs.length && !royal) slides.push({ k: 'r', dur: cf('rf').secs });
  const am = st.hl.autoMode ?? (st.hl.auto === false || st.hl.mode === 'off' ? 'off' : st.hl.mode === 'full' ? 'full' : 'block');
  if (am !== 'off' && (!royal || V('cu'))) slides.push({ k: 'h', t: 'מנהגי היום', x: reminders(h), full: am === 'full', dur: cf('hal').secs });
  hal.forEach((x) => slides.push({ k: 'h', t: x.title, x: [x.text], full: modeOf(x) === 'full', dur: cf('hal').secs }));
  // automatic daily halacha (admin: "הלכה יומית אוטומטית") – manual text overrides the built-in library
  const dh = { on: false, src: 'live_hy', mode: 'block', secs: 20, manual: '', ...(st.dh || {}) };
  const dhItem = dh.on && dh.mode !== 'off' ? (String(dh.manual || '').trim() ? { title: 'הלכה יומית', content: String(dh.manual).trim(), source: '' } : (isLive(dh.src) && dhLive) ? dhLive : pickDaily({ src: dh.src, dayNum: rdOf(now, 0), holidays: holNames(now, !!z.shkia && z.now >= z.shkia), dow: z.dow })) : null;
  if (dhItem) slides.push({ k: 'dh', d: dhItem, full: dh.mode === 'full', dur: Math.min(60, Math.max(10, +dh.secs || 20)) });
  // lessons + psalms: ONE combined slide (today / whole week) when enabled, otherwise one slide per lesson
  const ls = { mode: 'off', secs: 12, scope: 'today', ...(st.lsAll || {}) }, lsm = ls.mode === 'full' ? 'popup' : ls.mode, lsMin = (t) => { const m = /(\d+):(\d+)/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : 1e4; };
  const lsRows = lessons.filter((l) => ls.scope === 'week' || lessonOn(l, dt, z.dow)).map((l) => ({ l, time: prayerTime(l, z) })).sort((a, b) => lsMin(a.time) - lsMin(b.time));
  if ((lsm === 'block' || lsm === 'popup') && lsRows.length) slides.push({ k: 'ls', rows: lsRows, popup: lsm === 'popup', dur: Math.min(60, Math.max(5, +ls.secs || 12)) });
  else lessons.filter((l) => lessonOn(l, dt, z.dow)).forEach((l) => slides.push({ k: 'l', l, time: prayerTime(l, z), full: modeOf(l) === 'full', dur: cf('ann').secs }));
  // prayer times: ONE combined slide/popup listing all of today's selected prayers (off = top bar only; legacy 'full' = popup)
  const pm = pa.mode === 'full' ? 'popup' : pa.mode, ptRows = (() => { const sel = rowsToday.filter((r) => ['block', 'full'].includes(r.show)); return sel.length ? sel : rowsToday; })();
  if ((pm === 'block' || pm === 'popup') && ptRows.length) slides.push({ k: 'tall', full: false, popup: pm === 'popup', dur: pdur });
  const cur = slides[idx % (slides.length || 1)];
  const mrPages = Math.max(1, Math.ceil(refs.length / ipp('rf')));
  const textOf = (c) => (!c ? '' : c.k === 'a' ? c.a.content || '' : c.k === 'm' ? c.m.desc || '' : c.k === 'h' ? c.x.join('\n') : c.k === 'dh' ? c.d.content : '');
  const tparts = cur && cur.k !== 'r' && cur.k !== 'p' ? splitText(textOf(cur), cur.k === 'dh' ? (cur.full && royal ? 14 : 9) : st.lpp || 6) : [''];
  const FS_CAP = 10; // full-screen lists on the royal scroll: 2 per row x 5 rows per page; the rest continues on the next page
  const fsN = cur?.popup && royal ? (cur.k === 'tall' ? ptRows.length : cur.k === 'ls' ? cur.rows.length : 0) : 0;
  const subPages = cur?.k === 'r' ? mrPages : fsN ? Math.max(1, Math.ceil(fsN / FS_CAP)) : tparts.length;
  const tx = tparts[pg.mr % tparts.length];

  /* ----- carousel (frozen on Shabbat) ----- */
  useEffect(() => {
    if (!slides.length) return;
    const t = setTimeout(() => {
      if (pg.mr < subPages - 1) setPg((p) => ({ ...p, mr: p.mr + 1 }));
      else { setPg((p) => ({ ...p, mr: 0 })); setIdx((i) => i + 1); }
    }, (cur?.dur || 10) * 1000);
    return () => clearTimeout(t);
  }, [idx, pg.mr, slides.length, subPages]); // eslint-disable-line
  const yzPages = Math.max(1, Math.ceil(Math.max(mems.length, 1) / ipp('yz'))), rfPages = Math.max(1, Math.ceil(refs.length / ipp('rf')));
  useEffect(() => { if (yzPages < 2) return; const t = setInterval(() => setPg((p) => ({ ...p, yz: p.yz + 1 })), cf('mem').secs * 1000); return () => clearInterval(t); }, [yzPages, cf('mem').secs]); // eslint-disable-line
  useEffect(() => { if (rfPages < 2) return; const t = setInterval(() => setPg((p) => ({ ...p, rf: p.rf + 1 })), cf('rf').secs * 1000); return () => clearInterval(t); }, [rfPages, cf('rf').secs]); // eslint-disable-line

  /* ----- heartbeat for the admin "screen health" indicator ----- */
  const showing = cur ? (cur.a?.title || cur.l?.title || cur.m?.name || cur.row?.name || cur.t || (cur.k === 'r' ? 'רפואה שלמה' : cur.k === 'tall' ? 'זמני תפילות' : cur.k === 'ls' ? 'שיעורים ותהילים' : 'פרשה')) : '—';
  useEffect(() => {
    if (preview) return;
    const beat = () => !navigator.onLine || syn.id === 'demo' || setDoc(doc(db, 'synagogues', syn.id, 'screens', screenId), { lastSeen: serverTimestamp(), showing, index: Math.max(0, SCREENS.indexOf(screenId)) }, { merge: true }).catch(() => {});
    beat(); const t = setInterval(beat, 15000); return () => clearInterval(t);
  }, [syn.id, screenId, showing]);

  /* ----- slide content ----- */
  let mid = null, full = null, popup = null;
  const slide = (key, sty, lbl, body, foot, cls = '') => <div className={`an fade ${cls}`} key={key} style={sty}><div className="lb">{lbl}</div><div className="ab">{body}</div><div className="af">{foot}</div></div>;
  const emit = (el) => { if (cur.full) full = el; else mid = el; }, cl = cur?.full ? 'fsl' : '';
  if (!cur) mid = <div className="an"><div className="lb">✦ ברוכים הבאים ✦</div><div className="ab"><h3>{syn.name}</h3></div></div>;
  else if (cur.k === 'a') emit(slide(idx + '-' + pg.mr, afs('ann'), cur.a.label || '✦ הודעת הגבאי והנהלת בית הכנסת ✦', <><h3>{cur.a.title}</h3><p>{tx}</p></>, dotStr(tparts.length, pg.mr), cl));
  else if (cur.k === 'm') mid = slide(idx + '-' + pg.mr, afs('mem'), '🕯 לעילוי נשמת', <><h3>{fullName(cur.m)}</h3><p>{cur.m.gender === 'f' ? 'נפטרה' : cur.m.gender === 'p' ? 'נפטרו' : 'נפטר'} {gem(cur.m.d)} ב{monthName(cur.m.month)}{tx && <><br />{tx}</>}</p></>, dotStr(tparts.length, pg.mr));
  else if (cur.k === 'p') mid = slide(idx, afs('pr'), '✦ פרשת השבוע ✦', <><h3>{ptitle}</h3>{hText && <p>הפטרה: {hText}</p>}{st.pSub && <p>{st.pSub}</p>}</>, '');
  else if (cur.k === 'r') { const c = chunk(refs, ipp('rf'), pg.mr); mid = slide(idx + '-' + pg.mr, afs('rf'), '🏥 רפואה שלמה', <div className="pgw">{c.items.map((r) => <p key={r.id}><b>{fullName(r)}</b>{(r.blessing || r.note) ? ' · ' + (r.blessing || r.note) : ''}</p>)}</div>, dotStr(c.pages, pg.mr)); }
  else if (cur.k === 'tall') {
    const n = ptRows.length;
    const isAm = (r) => { const m = /(\d+):(\d+)/.exec(tOf(r) || ''); return m ? +m[1] < 13 : /שחרית|מוסף/.test(r.name); };
    const am = ptRows.filter(isAm), pm2 = ptRows.filter((r) => !isAm(r));
    const card = (r) => <div className="ptc" key={r.id}><b>{fullName(r)}</b><i>{tOf(r)}</i>{(r.blessing || r.note) && <small>{r.blessing || r.note}</small>}</div>;
    const ico = <div className="pti"><img src="/images/icons/prayer_times_icon.svg" alt="" /><h2 className="ptti">זמני תפילות</h2></div>;
    if (cur.popup && royal) {
      // full screen on the royal scroll: two columns (right = shacharit, left = mincha / arvit); falls back to a single column if one side is empty
      const fp = pg.mr % subPages, per = Math.ceil(ptRows.length / subPages / 2) * 2, items = ptRows.slice(fp * per, (fp + 1) * per), mx = Math.ceil(items.length / 2);
      full = <div className="rl-scroll" key={'sc' + idx + '-' + fp} style={{ '--sz': Math.max(1, Math.min(1.7, (st.scrollZ || 130) / 100)) }}><div className="rl-sc-card"><div className="ptb2" style={{ '--m': mx }}>{ico}
        <div className="ptg two cards">{items.map(card)}</div>{subPages > 1 && <div className="fsdots">{dotStr(subPages, fp)}</div>}</div></div></div>;
      mid = null;
    } else {
      const body = <div className="an fade ptb" key={'t' + idx}>{ico}
        <div className="ptl3" style={{ fontSize: Math.min(1, 7 / Math.max(n, 1)) + 'em', '--n': Math.max(n, 1) }}>{ptRows.map((r) => <div className="ptr" key={r.id}><b>{fullName(r)}</b><i>{tOf(r)}</i>{(r.blessing || r.note) && <small>{r.blessing || r.note}</small>}</div>)}</div></div>;
      if (cur.popup) { popup = <div className="popup"><div className="pcard">{body}</div></div>; mid = <div className="an"><div className="lb">✦ {syn.name} ✦</div><div className="ab" /></div>; }
      else mid = body; // block mode: in place on the central parchment
    }
  }
  else if (cur.k === 'dh') {
    const L = Math.max(60, (tx || '').length), dots = dotStr(tparts.length, pg.mr);
    if (cur.full && royal) {
      // royal full screen: the extended royal scroll, large readable text
      const f = Math.min(4.6, Math.max(2.2, Math.sqrt(3000 / L))).toFixed(2);
      full = <div className="rl-scroll" key={'dh' + idx + '-' + pg.mr} style={{ '--sz': Math.max(1, Math.min(1.7, (st.scrollZ || 130) / 100)) }}><div className="rl-sc-card"><div className="dhf"><em>✦ הלכה יומית ✦</em>{cur.d.title !== 'הלכה יומית' && <h3>{cur.d.title}</h3>}<p style={{ fontSize: f + 'cqh' }}>{tx}</p><small>{cur.d.source}{dots && <><br />{dots}</>}</small></div></div></div>;
      mid = null;
    } else {
      const em = L < 110 ? 2.5 : L < 200 ? 2.15 : L < 300 ? 1.8 : 1.45;
      emit(<div className={'an fade ' + cl} key={'dh' + idx + '-' + pg.mr} style={afs('hal')}><div className="lb">✦ הלכה יומית ✦</div><div className="ab">{cur.d.title !== 'הלכה יומית' && <h3>{cur.d.title}</h3>}<p style={cur.full ? undefined : { fontSize: em + 'em' }}>{tx}</p></div><div className="af">{cur.d.source}{dots && <><br />{dots}</>}</div></div>);
    }
  }
  else if (cur.k === 'l') emit(slide('l' + idx, afs('ann'), `${LESSON_TYPES[lessonType(cur.l)].ico} ${LESSON_TYPES[lessonType(cur.l)].name}`, <><h3>{cur.l.title}</h3><p>{[lessonWho(cur.l), cur.l.place].filter(Boolean).join(' · ')}<br />{cur.time}</p></>, '', cl));
  else if (cur.k === 'ls') {
    // dedicated screen: Torah lessons and Psalms recitals, visually separated (blue tag / rose tag), chronological inside each group
    const grpT = (t) => cur.rows.filter((x) => lessonType(x.l) === t), G = [['lesson', grpT('lesson')], ['psalms', grpT('psalms')]].filter(([, a]) => a.length), nAll = cur.rows.length, week = ls.scope === 'week';
    const sub = (l) => [lessonWho(l), l.place, week ? lessonDaysLabel(l) : ''].filter(Boolean).join(' · ');
    const hdr = (t) => <h4 className={'lsh ' + t}>{LESSON_TYPES[t].ico} {LESSON_TYPES[t].name}</h4>;
    const ttl = week ? 'שיעורי תורה ותהילים – השבוע' : 'שיעורי תורה ותהילים – היום';
    if (cur.popup && royal) {
      const fp = pg.mr % subPages, per = Math.ceil(cur.rows.length / subPages / 2) * 2, items = cur.rows.slice(fp * per, (fp + 1) * per), mx = Math.ceil(items.length / 2) + 1;
      const card = ({ l, time }) => <div className={'ptc ls-' + lessonType(l)} key={l.id}><b>{lessonLabel(l)}</b><i>{time}</i><small>{LESSON_TYPES[lessonType(l)].ico} {[lessonWho(l), l.place, week ? lessonDaysLabel(l) : ''].filter(Boolean).join(' · ')}</small></div>;
      full = <div className="rl-scroll" key={'ls' + idx + '-' + fp} style={{ '--sz': Math.max(1, Math.min(1.7, (st.scrollZ || 130) / 100)) }}><div className="rl-sc-card"><div className="ptb2" style={{ '--m': mx }}><h2 className="lsti">{ttl}</h2>
        <div className="ptg two cards">{items.map(card)}</div>{subPages > 1 && <div className="fsdots">{dotStr(subPages, fp)}</div>}</div></div></div>;
      mid = null;
    } else {
      const mxr = Math.max(...G.map(([, a]) => a.length), 1), lf = Math.min(1, 6 / (mxr + 1.5)) * (cur.popup ? 1 : Math.max(0.38, Math.min(0.72, 1.7 / (mxr + 0.4))));
      const body = <div className="an fade ptb lss" key={'ls' + idx} style={{ '--lf': lf }}><h2 className="lsti">{ttl}</h2>
        <div className={'lsg' + (G.length > 1 ? ' two' : '')}>{G.map(([t, a]) => <div key={t}>{hdr(t)}<div className="ptl3">{a.map(({ l, time }) => <div className={'ptr ls-' + t} key={l.id}><b>{lessonLabel(l)}</b><i>{time}</i>{sub(l) && <small>{sub(l)}</small>}</div>)}</div></div>)}</div></div>;
      if (cur.popup) { popup = <div className="popup"><div className="pcard">{body}</div></div>; mid = <div className="an"><div className="lb">✦ {syn.name} ✦</div><div className="ab" /></div>; }
      else mid = body;
    }
  }
  else if (cur.k === 't') emit(<div className={'an fade pts ' + cl} key={'t' + idx} style={afs('ann')}><div className="pti"><img src="/images/icons/prayer_times_icon.svg" alt="" /></div><div className="ab"><h3>{cur.row.name}</h3><p className="ptt">{cur.time}</p>{cur.row.note && <p className="ptn">{cur.row.note}</p>}</div>{slides.length > 1 && <div className="af">{dotStr(slides.length, idx % slides.length)}</div>}</div>);
  else emit(slide(idx + '-' + pg.mr, afs('hal'), '📖 הלכה ומנהגים', <><h3>{cur.t}</h3><p>{tx}</p></>, dotStr(tparts.length, pg.mr), cl));

  /* ----- blocks ----- */
  const side = st.side, sdw = LM === '4' ? 50 : LM === '2' ? side * 0.85 : side;
  const R = { 1: [0.637, 0.299], 2: [0.66, 0.27], 3: [0.52, 0.24], 4: [0.5, 0.5] }[LM];
  const B = (p) => ({ st, fs, ...p });
  const integ = LM === '2' && ptitle && V('pr');
  const ci = chagInfo(now, z, st.candle), rtOn = sh || z.dow === 6 || ci.chag; // Rabbeinu Tam only on Shabbat / Yom Tov
  const zrows = zmanimRows(z, st, rtOn), zr = zrows.map(([n, dt]) => [n, fmt(dt)]); // the times chosen in the admin (daily-zmanim settings)
  if (z.dow === 5 && z.shkia) zr.push(['הדלקת נרות', fmt(z.shkia.minus({ minutes: st.candle }))]);
  const crown = V('cr') && <Blk {...B({ id: 'cr', t: 'x', b: 2.3, cls: 'crown', fit: false, mult: LM === '3' ? 1.6 : 1, style: LM === '3' ? { padding: '.3em 2.6em' } : null })}>👑 {syn.name} 👑</Blk>;
  const hd = V('hd') && (
    <Blk {...B({ id: 'hd', t: 'x', b: 6, cls: 'hd' })}>
      <div className="dt">{integ && <em className="ptl">{ptitle}</em>}<b>{gem(h.d)} ב{monthName(h.raw)}</b><small>{now.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long' })}{integ && st.pSub ? ' · ' + st.pSub : ''}</small></div>
      {V('zm') && (st.zm?.profile === 'maor' || zOpts(st).method === 'oc') && <div style={{ textAlign: 'center', fontSize: '.55em', opacity: 0.8, marginBottom: '.3em' }}>זמני היום לפי לוח המאור – ישיבת אור החיים</div>}
      {V('zm') && <div className="zs">{zr.map(([n, t]) => <div key={n}><small>{n}</small><b>{t}</b></div>)}</div>}
    </Blk>);
  const pr = LM !== '2' && ptitle && V('pr') && (
    <Blk {...B({ id: 'pr', t: 'x', b: 8, cls: 'pr', style: { '--af': FONTS[cf('pr').font] } })}>
      <b>{ptitle}</b>{hText && <div className="hf">הפטרה: {hText}</div>}{(st.pSub || pi.sp.length > 0) && <div>{pi.sp.map((x) => <i key={x}>{x}</i>)}{st.pSub && <i>{st.pSub}</i>}</div>}
    </Blk>);
  const cu = V('cu') && <Blk {...B({ id: 'cu', t: 'x', b: 2.6, cls: 'cu', mult: LM === '4' ? 1.3 : 1 })}><span className="cl">💡 מנהגי היום בתפילה:</span>{chips.map((c, i) => <i key={i}>{c}</i>)}</Blk>;
  const mn = <Blk {...B({ id: 'mn', t: 'r', b: LM === '3' ? 52 : 100 - sdw, cls: 'pn mn', share: LM === '3' ? 0.52 : LM === '4' ? 0.5 : R[0] })}><div className="slot" key={'slot-' + idx + '-' + pg.mr}>{mid}</div>{!full && slides.length > 1 && cur && <><i className="prg" key={'prg-' + idx + '-' + pg.mr} style={{ '--d': cur.dur + 's' }} />{st.cdn !== false && <Cd key={'cd-' + idx + '-' + pg.mr} d={cur.dur} />}</>}</Blk>;
  const yzList = mems.length ? mems : null, yc = chunk(yzList || [0], ipp('yz'), pg.yz);
  const yz = V('yz') && (
    <Blk {...B({ id: 'yz', t: 's', b: 3, cls: 'pn yz', share: R[1], style: { fontFamily: FONTS[cf('mem').font] } })}>
      <div className="lb">🕯 לעילוי נשמת</div>
      <div className="pgw fade" key={'yz' + pg.yz}>{yzList ? yc.items.map((m) => <div className="yi" key={m.id}><b>{fullName(m)}</b><small>{!m.mode || m.mode === 'y' ? `${m.gender === 'f' ? 'נפטרה' : m.gender === 'p' ? 'נפטרו' : 'נפטר'} ${gem(m.d)} ב${monthName(m.month)} • ` : ''}{m.blessing || 'ת.נ.צ.ב.ה'}</small>{m.desc && <small style={{ display: 'block' }}>{m.desc}</small>}</div>) : <div className="yi"><small>אין הנצחות להיום</small></div>}</div>
      <div className="dots">{yc.pages > 1 ? Array.from({ length: yc.pages }, (_, i) => (i === pg.yz % yc.pages ? '●' : '○')).join(' ') : ''}</div>
    </Blk>);
  const rc = chunk(refs, ipp('rf'), pg.rf);
  const rf = V('rf') && (
    <Blk {...B({ id: 'rf', t: 's', b: 2, cls: 'pn rf', share: R[1], style: { fontFamily: FONTS[cf('rf').font] } })}>
      <div className="lb">🏥 רפואה שלמה</div>
      <div className="pgw fade" key={'rf' + pg.rf}>{refs.length ? rc.items.map((r) => <div className="yi" key={r.id}><b>{fullName(r)}</b>{(r.blessing || r.note) && <small>{r.blessing || r.note}</small>}</div>) : <div className="yi"><small>אין שמות לרפואה שלמה כרגע</small></div>}</div>
      <div className="dots">{rc.pages > 1 ? Array.from({ length: rc.pages }, (_, i) => (i === pg.rf % rc.pages ? '●' : '○')).join(' ') : ''}</div>
    </Blk>);
  const hasDon = !!(st.payUrl || st.donTitle || st.donSub);
  const qr = V('qr') && onS(st.donScreen) && hasDon && (
    <Blk {...B({ id: 'qr', t: 's', b: 2, cls: 'pn dn', share: R[1] })}>
      {st.donTitle && <div>{st.donTitle}</div>}
      {st.payUrl && <div className="qrw"><div className="qr"><QRCodeSVG value={st.payUrl} size={Math.round(fs * 7 * st.qs / 100)} /></div></div>}
      {st.donSub && <small>{st.donSub}</small>}
    </Blk>);
  const bar = Object.entries(grp).map(([k, g]) => <span className="pg" key={k}>{k}:<i>{[...g.t].sort().join(' , ')}</i>{g.n.length > 0 && <small style={{ fontSize: '.55em', fontWeight: 500, marginInlineStart: '.4em' }}>{g.n.join(' · ')}</small>}</span>);
  const pb = <Blk {...B({ id: 'pb', t: 'x', b: 3.5, cls: 'pb' })}>{bar.length ? bar.flatMap((b, i) => (i ? [<span key={'d' + i} style={{ opacity: .6 }}>♦</span>, b] : [b])) : '—'}</Blk>;
  const pbl = <Blk {...B({ id: 'pb', t: 's', b: 3, cls: 'pn pbl', share: R[1] })}><div className="lb">🕍 זמני תפילות</div>{Object.entries(grp).map(([k, g]) => <div className="tr" key={k}><b>{k}</b><i>{[...g.t].sort().join(' , ')}</i></div>)}</Blk>;
  const first = (t) => (t || '').split('\n')[0];
  const pbShown = V('pb') && LM !== '3';
  const tkText = [st.tkText,
    st.tkParsha && ptitle ? ptitle + (hText ? ` · הפטרה: ${hText}` : '') : '',
    ...(cols.announcements || []).filter((a) => a.ticker && onS(a.screen) && annOn(a, h)).map((a) => a.title + (first(a.content) ? ' – ' + first(a.content) : '')),
    ...(cols.lessons || []).filter((l) => l.ticker && onS(l.screen) && lessonOn(l, dt, z.dow)).map((l) => `${lessonType(l) === 'psalms' ? lessonLabel(l) : 'שיעור ' + l.title}${lessonWho(l) ? ' · ' + lessonWho(l) : ''} · ${prayerTime(l, z)}`),
    ...rowsToday.filter((r) => r.ticker || (inBar(r) && !pbShown)).map((r) => `${r.name}: ${tOf(r)}`),
    ...mems.filter((m) => m.ticker).map((m) => `לעילוי נשמת ${fullName(m)}`)].filter(Boolean).join('   ✦   ');
  const tkOn = !!(V('tk') && tkText && onS(st.tkScreen) && syn.plan?.features?.runningTicker);
  const tk = tkOn && <div className="tk"><span>{tkText}</span></div>;
  const col = (kids, f) => kids.some(Boolean) && <div className="sd" style={{ flex: f }}>{Children.toArray(kids)}</div>;

  let body;
  if (LM === '3') body = <>{crown}{hd}{pr}{cu}<div className="bd">{col([yz, rf], 24)}{mn}{col([pbl, qr], 24)}</div>{tk}</>;
  else if (LM === '4') body = <>{crown}{hd}{pr}<div className="bd">{mn}{col([yz, rf, qr], 50)}</div>{cu}{tk}{pb}</>;
  else body = <>{crown}{hd}{pr}{cu}<div className="bd">{mn}{col([yz, rf, qr], sdw)}</div>{tk}{pb}</>;

  const clock = now.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false });
  const rg = Object.keys(grp).length ? grp : allGrp, bn = Object.keys(rg).length, rbox = (l, t, w, hh) => ({ position: 'absolute', left: l + '%', top: t + '%', width: w + '%', height: hh + '%' });
  if (royal) {
    const m2 = LM === '2', m4 = LM === '4', ps = m2 || m4; // model 2: parsha + haftara live in the top bar, the freed middle goes to bigger cards
    const zl = zrows; // same list as the zmanim slide (admin: daily zmanim > what the screen shows)
    const hdMode = st.hdMode === 'marquee' ? 'marquee' : st.hdMode === 'fixed' ? 'fixed' : 'auto', btMode = st.btMode === 'marquee' ? 'marquee' : st.btMode === 'fixed' ? 'fixed' : 'auto'; // auto = fixed, but scrolls when too long to read
    const hdM = hdMode === 'marquee', btM = btMode === 'marquee';
    const SEP = ' ✦ ', zText = zl.map(([n, t]) => `${n}: ${fmt(t)}`).join(SEP);
    const fitCw = (t) => Math.max(btMode === 'fixed' ? 0.7 : 0.9, Math.min(1.9, 40 / Math.max(10, t.length * 0.5))) + 'cqw';
    // side-column width/height sliders: the column grows/shrinks and the main panel takes (or gives back) the difference
    const sdF = Math.max(0.5, Math.min(1.6, (st.side ?? 32) / 32)), sdH = Math.max(0.5, Math.min(1.2, (st.sideH || 100) / 100));
    const sa = (cw, mw) => { const d = Math.max(-cw * 0.5, Math.min(cw * (sdF - 1), mw - 24)); return { d: Math.abs(d) < 0.01 ? 0 : d, m: { w: 1 + d / cw, h: sdH } }; };
    const gh = (l, t, w, h) => ({ position: 'absolute', left: Math.max(0, l - 0.7) + '%', top: Math.max(0, t - 1.2) + '%', width: Math.min(100, w + 1.4) + '%', height: Math.min(100, h + 2.4) + '%' }), mnNom = m4 ? [28.56, 21.9, 62.3, 66.4] : m2 ? [50.5, 22.1, 37.6, 64.6] : [50.5, 37.8, 37.6, 48.8];
    const RB = m4
      ? { mn: royBox(st, 'mn', 28.56 + sa(18.7, 62.3).d, 21.9, 62.3 - sa(18.7, 62.3).d, 66.4, 'r', null, sa(18.7, 62.3).d !== 0), yz: royBox(st, 'yz', 9.16, 21.9, 18.7, 21.2, 'l', sa(18.7, 62.3).m), rf: royBox(st, 'rf', 9.16, 44.4, 18.7, 21.2, 'l', sa(18.7, 62.3).m), qr: royBox(st, 'qr', 9.16, 66.9, 18.7, 21.2, 'l', sa(18.7, 62.3).m), hd: royBox(st, 'hd', 9.3, 8.5, 81.4, 11.5) }
      : m2
      ? { mn: royBox(st, 'mn', 50.5 + sa(35.6, 37.6).d, 22.1, 37.6 - sa(35.6, 37.6).d, 64.6, 'r', null, sa(35.6, 37.6).d !== 0), yz: royBox(st, 'yz', 12.7, 22.1, 35.6, 31.6, 'l', sa(35.6, 37.6).m), rf: royBox(st, 'rf', 12.7, 55.2, 35.6, 31.5, 'l', sa(35.6, 37.6).m), hd: royBox(st, 'hd', 9.3, 8.5, 81.4, 11.5) }
      : { mn: royBox(st, 'mn', 50.5 + sa(35.5, 37.6).d, 37.8, 37.6 - sa(35.5, 37.6).d, 48.8, 'r', null, sa(35.5, 37.6).d !== 0), yz: royBox(st, 'yz', 12.7, 37.8, 35.5, 21.5, 'l', sa(35.5, 37.6).m), rf: royBox(st, 'rf', 12.7, 60.9, 35.5, 25.7, 'l', sa(35.5, 37.6).m), pr: royBox(st, 'pr', 13.5, 22.2, 73, 13.6), hd: royBox(st, 'hd', 9.3, 8.5, 81.4, 11.5) };
    stackCol([V('yz') && RB.yz, V('rf') && RB.rf, m4 && V('qr') && onS(st.donScreen) && hasDon && RB.qr], m4 ? 21.9 : m2 ? 22.1 : 37.8, m4 ? 88.1 : m2 ? 86.7 : 86.6, m4 ? 28.4 : 49.3);
    const fb = (k) => ((st.blocks?.[k]?.fs ?? st.fsAll ?? 18) / 18), pf = fb('pr').toFixed(3);
    body = <div className="rl">
      <div className={'rl-top ' + (ps ? 'ps ' : '') + RB.hd.cls} style={{ ...RB.hd.style, '--hs': fb('hd').toFixed(3) }}>
        {V('hd') && <div className="rl-date"><span className="rl-cal"><b>{gem(h.d)}</b><small>{monthName(h.raw)}</small></span><div className="rl-dd"><b>{now.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long' })}</b><small>{now.toLocaleDateString('en-GB', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric' })}</small></div></div>}
        {V('pt') && (() => { const items = bn ? Object.entries(rg).map(([k, g]) => <div key={k}><small>{k}</small><b className={g.t.length > 1 ? 'mt' : undefined}>{[...g.t].sort().map((t, i) => <span key={i}>{t}</span>)}</b></div>) : <div><small>זמני תפילות</small><b>—</b></div>;
          const len = Object.entries(rg).reduce((a, [k, g]) => a + k.length + [...g.t].join(' · ').length, 0);
          const hdAuto = hdM || (hdMode === 'auto' && (bn > (ps ? 6 : 8) || Object.values(rg).some((g) => g.t.length > 2))); // too many/long times -> scroll instead of overlapping
          return hdAuto
            ? <div className="rl-times rl-mq"><div className="in" style={{ animationDuration: Math.max(18, len * 0.5) + 's' }}>{items}</div></div>
            : <div className="rl-times" style={{ '--rn': Math.max(bn, 1), '--tf': Math.min(2.6, (46 / Math.max(bn, 1) - 2.4) / (0.5 * 5)).toFixed(2) + 'cqw' }}>{items}</div>; })()}
        {ps && V('pr') && <div className="rl-ps" style={{ '--pf': pf }}><div className="rl-pt"><b>{ptitle || syn.name}</b>{hText && <small>❦ הפטרה: {hText} ❦</small>}</div></div>}
        {V('cr') && <div className="rl-name"><div><em>בית הכנסת</em><b>{(syn.name || '').replace(/^בית הכנסת\s*/, '')}</b><small>{st.subtitle || 'תורה · תפילה · חסד'}</small></div><img src="/images/icons/synagogue_illustration.png" alt="" /></div>}
      </div>
      {!ps && V('pr') && <div className={'rl-parsha ' + RB.pr.cls} style={{ ...RB.pr.style, '--pf': pf }}><i>❧</i><div className="rl-pt"><b>{ptitle || syn.name}</b>{hText && <small>❦ הפטרה: {hText} ❦</small>}</div><i style={{ transform: 'scaleX(-1)' }}>❧</i></div>}
      {!ps && !V('pr') && <div className="rl-ghost" style={RB.pr.hide} />}
      {RB.mn.ghost && <div className="rl-ghost" style={RB.mn.ghost} />}
      {RB.mn.ghost && Math.abs(sa(m4 ? 18.7 : m2 ? 35.6 : 35.5, m4 ? 62.3 : 37.6).d) > 0 && <div className="rl-ghost" style={gh(mnNom[0], mnNom[1], mnNom[2], mnNom[3])} />}
      <Blk {...B({ id: 'mn', t: 'x', b: 8, cls: 'rl-main ' + RB.mn.cls, share: m4 ? 0.4 : 0.3, mult: m2 ? 1.2 : 1, fit: true, style: RB.mn.style })}><div className="slot" key={'slot-' + idx + '-' + pg.mr}>{mid}</div>{!full && slides.length > 1 && cur && <><i className="prg" key={'prg-' + idx + '-' + pg.mr} style={{ '--d': cur.dur + 's' }} />{st.cdn !== false && <Cd key={'cd-' + idx + '-' + pg.mr} d={cur.dur} />}</>}</Blk>
      {V('yz') ? RB.yz.ghost && <div className="rl-ghost" style={RB.yz.ghost} /> : <div className="rl-ghost" style={RB.yz.hide} />}
      {V('yz') && <Blk {...B({ id: 'yz', t: 'x', b: 3, cls: 'rl-card rl-yz ' + RB.yz.cls, share: m4 ? 0.2 : 0.27, mult: m2 ? 1.25 : 1, style: RB.yz.style })}>
        <div className="rl-ic"><img src="/images/icons/candle.png" alt="" /></div><div className="rl-bd"><div className="lb">לעילוי נשמת</div>
        <div className="pgw fade" key={'yz' + pg.yz}>{yzList ? yc.items.map((m) => <div className="yi" key={m.id}><b>{fullName(m)}</b><small>{!m.mode || m.mode === 'y' ? `${m.gender === 'f' ? 'נפטרה' : m.gender === 'p' ? 'נפטרו' : 'נפטר'} ${gem(m.d)} ב${monthName(m.month)} • ` : ''}{m.blessing || 'ת.נ.צ.ב.ה'}</small>{m.desc && <small style={{ display: 'block' }}>{m.desc}</small>}</div>) : <div className="yi"><small>אין הנצחות להיום</small></div>}</div></div></Blk>}
      {V('rf') ? RB.rf.ghost && <div className="rl-ghost" style={RB.rf.ghost} /> : <div className="rl-ghost" style={RB.rf.hide} />}
      {V('rf') && <Blk {...B({ id: 'rf', t: 'x', b: 3, cls: 'rl-card rl-rf ' + RB.rf.cls, share: m4 ? 0.2 : 0.27, mult: m2 ? 1.25 : 1, style: RB.rf.style })}>
        <div className="rl-ic"><img src="/images/icons/praying_hands.png" alt="" /></div><div className="rl-bd"><div className="lb">רפואה שלמה</div>
        <div className="pgw fade" key={'rf' + pg.rf}>{refs.length ? rc.items.map((r) => <div className="yi" key={r.id}><b>{fullName(r)}</b>{(r.blessing || r.note) && <small>{r.blessing || r.note}</small>}</div>) : <div className="yi"><small>אין שמות לרפואה שלמה כרגע</small></div>}</div></div></Blk>}
      {m4 && (V('qr') && onS(st.donScreen) && hasDon ? RB.qr.ghost && <div className="rl-ghost" style={RB.qr.ghost} /> : <div className="rl-ghost" style={RB.qr.hide} />)}
      {m4 && V('qr') && onS(st.donScreen) && hasDon && <Blk {...B({ id: 'qr', t: 'x', b: 3, cls: 'rl-card rl-qr ' + RB.qr.cls, share: 0.2, style: RB.qr.style })}>
        {st.payUrl && <div className="rl-ic"><div className="rl-qrb" style={{ '--qs': (st.qs || 100) / 100 }}><QRCodeSVG value={st.payUrl} size={160} /></div></div>}<div className="rl-bd">
        {(st.donTitle || st.donSub) && <div className="pgw"><div className="yi">{st.donTitle && <b>{st.donTitle}</b>}{st.donSub && <small>{st.donSub}</small>}</div></div>}</div></Blk>}
      <div className="rl-bot" style={{ ...rbox(7.6, 89.8, 84.7, 7.6), '--bs': fb('bt').toFixed(3) }}>
        <div className="rl-fx">{st.footerText || 'עם ישראל חי'}</div>
        <div className="rl-tk">{(() => {
          const bText = [tkOn && tkText, V('zm') && zText].filter(Boolean).join(SEP); // running ticker text first, then the day's times
          if (!bText) return null;
          const raw = 40 / Math.max(10, bText.length * 0.5), mq = btM || tkOn || (btMode === 'auto' && raw < 1.3); // too long to read statically -> scroll instead of tiny text
          const tx = st.blocks?.bt?.tx ? { color: st.blocks.bt.tx } : {};
          return mq
            ? <div className="rl-stat rl-mq" style={{ fontSize: `calc(2.1cqw * ${fb('bt').toFixed(3)})`, ...tx }}><span className="in" style={{ animationDuration: Math.max(18, bText.length * 0.45) + 's' }}>{bText}</span></div>
            : btMode === 'fixed' && raw < 1.3 // fixed + too much text: a carousel of readable pages (same size as short text) instead of shrinking or squeezing everything
              ? (() => { const pages = []; let c = ''; bText.split(SEP).forEach((x) => { if (c && (c + SEP + x).length > 58) { pages.push(c); c = x; } else c = c ? c + SEP + x : x; }); if (c) pages.push(c);
                const i = btI % pages.length, pt = pages[i], long = pt.length > 62;
                return <div key={'bp' + i} className={'rl-stat bpg' + (long ? ' two' : '')} style={{ fontSize: `calc(${fitCw(long ? pt.slice(0, Math.ceil(pt.length / 2) + 6) : pt)} * ${fb('bt').toFixed(3)})`, ...tx }}>{pt}{pages.length > 1 && <i className="bpd">{pages.map((_, k) => <u key={k} className={k === i ? 'on' : ''} />)}</i>}</div>; })()
              : <div className="rl-stat" style={{ fontSize: `calc(${fitCw(bText)} * ${fb('bt').toFixed(3)})`, ...tx }}>{bText}</div>; })()}</div>
        <div className="rl-clk">{clock}</div>
      </div>
    </div>;
  }
  const frame = st.vis?.frm === false ? 'clean' : st.frame || 'royal';
  const style = { fontSize: fs, ...(royal ? { backgroundImage: `url(/images/templates/${LM === '2' ? 'royal_bg_m2' : LM === '4' ? 'royal_bg_m4' : 'royal_bg'}.png)`, backgroundSize: '100% 100%' } : tbgOn ? { backgroundImage: `url(${tbgSrc})` } : {}), '--u': fs + 'px', ...(st.accent ? { '--dac': st.accent, '--dac2': st.accent } : {}),
    ...(st.bg ? { background: `linear-gradient(${'#000a,#000c'}),url(${st.bg}) center/cover` } : {}) };
  return (
    <div className={`dp fr-${frame} cs-${st.cardStyle || 'clean'}`} data-t="gold" data-tbg={royal ? undefined : tbgOn ? tbgKey : undefined} data-royal={royal ? '1' : undefined} data-lm={LM} data-a={st.anim} style={style}>
      <i className="cn a" /><i className="cn b" /><i className="cn c" /><i className="cn d" />
      {body}{full}{popup}
      {status !== 'live' && (quiet
        ? <span title="אין חיבור לאינטרנט – מוצגים הנתונים האחרונים שנשמרו" style={{ position: 'absolute', bottom: 6, left: 8, width: 7, height: 7, borderRadius: '50%', background: '#d9534f', opacity: 0.75 }} />
        : <span style={{ position: 'absolute', bottom: 4, left: 8, fontSize: 10, opacity: 0.6, direction: 'rtl', maxWidth: '70%' }}>● {status === 'demo' ? 'מצב הדגמה · ממתין לחיבור, הנתונים יתעדכנו אוטומטית' : status === 'error' ? 'אין חיבור' : 'מצב גיבוי'}{(() => { const c = diag || ''; if (!c || preview) return null; const why = /operation-not-allowed|admin-restricted/.test(c) ? 'התחברות אנונימית כבויה ב-Firebase Authentication' : /^auth\//.test(c) || authErr ? 'כשל בהתחברות אנונימית' : /permission-denied/.test(c) ? 'אין הרשאת קריאה – בדקו Firestore Rules והתחברות אנונימית' : /not-found/.test(c) ? 'בית הכנסת לא נמצא – בדקו את ?s= בכתובת' : /unavailable|network/.test(c) ? 'אין חיבור לשרת' : ''; return <> · {why ? why + ' · ' : ''}<span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{c}</span></>; })()}</span>)}
    </div>);
}
