'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSynagogue } from '@/lib/hooks';
import { dayType, fmt, getZmanim, isShabbat, prayerTime } from '@/lib/zmanim';
import { annOn, gem, hebOf, holNames, memOn, monthName, parshaInfo, refuahOn, reminders } from '@/lib/hebrew';
import { DEFAULT_SETTINGS, FONTS, SCREENS } from '@/lib/types';

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
/** Block whose font scales with its own width (auto responsive scaling). */
function Blk({ st, fs, id, t, b, cls, share = 0.95, mult = 1, fit = true, style, children }) {
  const ref = useRef(null);
  const fm = ((st.blocks?.[id]?.fs ?? 18) / 18) * mult; // per-block text size (12-26, 18 = default)
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

export default function Display({ sid, screenId }) {
  const { syn, cols, status } = useSynagogue(sid);
  const [now, setNow] = useState(() => new Date());
  const [size, setSize] = useState({ w: 1280, h: 720 });
  useEffect(() => { const u = () => setSize({ w: innerWidth, h: innerHeight }); u(); addEventListener('resize', u); return () => removeEventListener('resize', u); }, []);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  if (!syn) return <div className="dp"><p style={{ margin: 'auto', textAlign: 'center' }}>{syn === null ? 'בית הכנסת לא נמצא' : status === 'error' ? 'שגיאת חיבור. מנסה להתחבר שוב ברקע…' : 'טוען נתונים…'}</p></div>;
  if (syn.suspended) return <div className="dp"><div style={{ margin: 'auto', textAlign: 'center' }}><h1>⏸ המסך מושהה</h1><p>השירות לבית כנסת זה הושהה זמנית. לפרטים פנו למנהל המערכת.</p></div></div>;
  return <Inner syn={syn} cols={cols} screenId={screenId} now={now} size={size} status={status} />;
}

function Inner({ syn, cols, screenId, now, size, status }) {
  const st = { ...DEFAULT_SETTINGS, ...syn.settings };
  const z = getZmanim(now, syn.location || { lat: 31.77, lng: 35.21 }, st.shma);
  const sh = isShabbat(z, st.candle, st.force);
  const h = hebOf(now, !!z.shkia && z.now >= z.shkia);
  const LM = st.layout || '1';
  const fs = (size.h > size.w ? size.w / 52 : Math.min(size.w / 72, size.h / 40)) * st.zoom;
  const cf = (k) => ({ font: 'david', size: 18, secs: 10, ...(st.cf || {})[k] });
  const afs = (k) => ({ '--af': FONTS[cf(k).font] }); // text size comes from the block (accordion), font from the component
  const onS = (s) => !s || s === 'all' || s === screenId;
  const V = (k) => (st.vis || {})[k] !== false;
  const ipp = (k) => Math.max(1, st.ipp?.[k] || 3);
  const [idx, setIdx] = useState(0);
  const [pg, setPg] = useState({ yz: 0, rf: 0, mr: 0 });

  /* ----- content ----- */
  const pi = parshaInfo(now, z.dow, !!z.tzeit && z.now >= z.tzeit);
  const ptitle = st.pMode === 'manual' && st.pTitle ? st.pTitle : pi.title;
  const anns = (cols.announcements || []).filter((a) => modeOf(a) !== 'off' && onS(a.screen) && annOn(a, h));
  const mems = (cols.memorials || []).filter((m) => onS(m.screen) && memOn(m, h));
  const refs = (cols.refuah || []).filter((r) => onS(r.screen) && refuahOn(r, h));
  const hal = (cols.halacha || []).filter((x) => modeOf(x) !== 'off' && onS(x.screen));
  const dt = dayType(sh, z.dow);
  const rows0 = (cols.prayers || []).filter((r) => onS(r.screen)).filter((r) => r.days === 'all' || r.days === dt || (dt !== 'shab' && r.days === 'week'));
  const fw = (r) => r.name.split(' ')[0];
  const spec = new Set(rows0.filter((r) => r.days === dt && dt !== 'week').map(fw));
  const rcm = (h.d === 1 && h.raw !== 'Tishri') || h.d === 30;
  const ovr = (r) => (cols.overrides || []).find((o) => o.prayerId === r.id && (o.kind === 'rc' ? rcm : o.kind === 'h' && o.day === h.d && (o.month === h.raw || (o.month === 'Adar' && h.raw === 'Adar II'))));
  const grp = {};
  const rowsToday = rows0.filter((r) => !(r.days === 'week' && spec.has(fw(r))));
  const tOf = (r) => ovr(r)?.time || prayerTime(r, z);
  const pa = st.ptAll || { mode: 'off', secs: 10 }, pdur = pa.secs || 10;
  const allGrp = {};
  rowsToday.filter((r) => (r.show ?? 'bar') !== 'off').forEach((r) => { (allGrp[fw(r)] ||= { t: [], n: [] }).t.push(tOf(r)); if (r.note) allGrp[fw(r)].n.push(r.note); });
  rowsToday.filter((r) => (r.show ?? 'bar') === 'bar').forEach((r) => { (grp[fw(r)] ||= { t: [], n: [] }); grp[fw(r)].t.push(tOf(r)); if (r.note) grp[fw(r)].n.push(r.note); });
  const cMode = st.customs?.mode || 'auto', manual = (st.customs?.text || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const auto = [...holNames(now, !!z.shkia && z.now >= z.shkia), ...reminders(h)];
  const chips = cMode === 'manual' ? manual : cMode === 'both' ? [...auto, ...manual] : auto;

  const slides = [];
  if (st.pSlide && V('pr')) slides.push({ k: 'p', dur: cf('pr').secs });
  anns.forEach((a) => slides.push({ k: 'a', a, full: modeOf(a) === 'full', dur: cf('ann').secs }));
  if (V('memPop')) mems.filter((m) => (!m.mode || m.mode === 'y')).forEach((m) => slides.push({ k: 'm', m, dur: cf('mem').secs }));
  if (V('rf') && V('rfPop') && refs.length) slides.push({ k: 'r', dur: cf('rf').secs });
  const am = st.hl.autoMode ?? (st.hl.auto === false || st.hl.mode === 'off' ? 'off' : st.hl.mode === 'full' ? 'full' : 'block');
  if (am !== 'off') slides.push({ k: 'h', t: 'מנהגי היום', x: reminders(h), full: am === 'full', dur: cf('hal').secs });
  hal.forEach((x) => slides.push({ k: 'h', t: x.title, x: [x.text], full: modeOf(x) === 'full', dur: cf('hal').secs }));
  rowsToday.filter((r) => ['block', 'full'].includes(r.show)).forEach((r) => slides.push({ k: 't', row: r, time: tOf(r), full: r.show === 'full', dur: pdur }));
  if (pa.mode && pa.mode !== 'off') slides.push({ k: 'tall', full: pa.mode === 'full', popup: pa.mode === 'popup', dur: pdur });
  const cur = slides[idx % (slides.length || 1)];
  const mrPages = Math.max(1, Math.ceil(refs.length / ipp('rf')));
  const textOf = (c) => (!c ? '' : c.k === 'a' ? c.a.content || '' : c.k === 'm' ? c.m.desc || '' : c.k === 'h' ? c.x.join('\n') : '');
  const tparts = cur && cur.k !== 'r' && cur.k !== 'p' ? splitText(textOf(cur), st.lpp || 6) : [''];
  const subPages = cur?.k === 'r' ? mrPages : tparts.length;
  const tx = tparts[pg.mr % tparts.length];

  /* ----- carousel (frozen on Shabbat) ----- */
  useEffect(() => {
    if (sh || !slides.length) return;
    const t = setTimeout(() => {
      if (pg.mr < subPages - 1) setPg((p) => ({ ...p, mr: p.mr + 1 }));
      else { setPg((p) => ({ ...p, mr: 0 })); setIdx((i) => i + 1); }
    }, (cur?.dur || 10) * 1000);
    return () => clearTimeout(t);
  }, [idx, pg.mr, slides.length, sh, subPages]); // eslint-disable-line
  const yzPages = Math.max(1, Math.ceil(Math.max(mems.length, 1) / ipp('yz'))), rfPages = Math.max(1, Math.ceil(refs.length / ipp('rf')));
  useEffect(() => { if (yzPages < 2) return; const t = setInterval(() => setPg((p) => ({ ...p, yz: p.yz + 1 })), cf('mem').secs * 1000); return () => clearInterval(t); }, [yzPages, cf('mem').secs]); // eslint-disable-line
  useEffect(() => { if (rfPages < 2) return; const t = setInterval(() => setPg((p) => ({ ...p, rf: p.rf + 1 })), cf('rf').secs * 1000); return () => clearInterval(t); }, [rfPages, cf('rf').secs]); // eslint-disable-line

  /* ----- heartbeat for the admin "screen health" indicator ----- */
  const showing = cur ? (cur.a?.title || cur.m?.name || cur.row?.name || cur.t || (cur.k === 'r' ? 'רפואה שלמה' : cur.k === 'tall' ? 'זמני תפילות' : 'פרשה')) : '—';
  useEffect(() => {
    const beat = () => setDoc(doc(db, 'synagogues', syn.id, 'screens', screenId), { lastSeen: serverTimestamp(), showing, index: Math.max(0, SCREENS.indexOf(screenId)) }, { merge: true }).catch(() => {});
    beat(); const t = setInterval(beat, sh ? 60000 : 15000); return () => clearInterval(t);
  }, [syn.id, screenId, showing, sh]);

  /* ----- slide content ----- */
  let mid = null, full = null, popup = null;
  const slide = (key, sty, lbl, body, foot, cls = '') => <div className={`an fade ${cls}`} key={key} style={sty}><div className="lb">{lbl}</div><div className="ab">{body}</div><div className="af">{foot}</div></div>;
  const emit = (el) => { if (cur.full) full = el; else mid = el; }, cl = cur?.full ? 'fsl' : '';
  if (sh) mid = <div className="an"><div className="lb">✦ הודעות לשבת ✦</div><div className="ab" style={{ justifyContent: 'flex-start' }}>{anns.map((a) => <div className="ai" key={a.id}><h3>{a.title}</h3><p>{a.content}</p></div>)}</div></div>;
  else if (!cur) mid = <div className="an"><div className="lb">✦ ברוכים הבאים ✦</div><div className="ab"><h3>{syn.name}</h3></div></div>;
  else if (cur.k === 'a') emit(slide(idx + '-' + pg.mr, afs('ann'), '✦ הודעת הגבאי והנהלת בית הכנסת ✦', <><h3>{cur.a.title}</h3><p>{tx}</p></>, dotStr(tparts.length, pg.mr), cl));
  else if (cur.k === 'm') mid = slide(idx + '-' + pg.mr, afs('mem'), '🕯 לעילוי נשמת', <><h3>{cur.m.name}</h3><p>{cur.m.gender === 'f' ? 'נפטרה' : 'נפטר'} {gem(cur.m.d)} ב{monthName(cur.m.month)}{tx && <><br />{tx}</>}</p></>, dotStr(tparts.length, pg.mr));
  else if (cur.k === 'p') mid = slide(idx, afs('pr'), '✦ פרשת השבוע ✦', <><h3>{ptitle}</h3>{st.pSub && <p>{st.pSub}</p>}</>, '');
  else if (cur.k === 'r') { const c = chunk(refs, ipp('rf'), pg.mr); mid = slide(idx + '-' + pg.mr, afs('rf'), '🏥 רפואה שלמה', <div className="pgw">{c.items.map((r) => <p key={r.id}><b>{r.name}</b>{r.note ? ' · ' + r.note : ''}</p>)}</div>, dotStr(c.pages, pg.mr)); }
  else if (cur.k === 'tall') {
    const n = Object.keys(allGrp).length;
    const body = <div className="ptl2" style={{ fontSize: Math.min(1, 8 / Math.max(n, 1)) + 'em' }}>{Object.entries(allGrp).map(([k, g]) => <div className="tr" key={k}><b>{k}</b><i>{[...g.t].sort().join(' , ')}{g.n.length > 0 && <small> {g.n.join(' · ')}</small>}</i></div>)}</div>;
    if (cur.popup) { popup = <div className="popup"><div className="pcard">{slide('t' + idx, afs('ann'), '🕍 זמני תפילות', body, '')}</div></div>; mid = <div className="an"><div className="lb">✦ {syn.name} ✦</div><div className="ab" /></div>; }
    else emit(slide('t' + idx, afs('ann'), '🕍 זמני תפילות', body, '', cl));
  }
  else if (cur.k === 't') emit(slide(idx, afs('ann'), '🕍 זמני תפילות', <><h3>{cur.row.name}</h3><p>{cur.time}</p>{cur.row.note && <p>{cur.row.note}</p>}</>, '', cl));
  else emit(slide(idx + '-' + pg.mr, afs('hal'), '📖 הלכה ומנהגים', <><h3>{cur.t}</h3><p>{tx}</p></>, dotStr(tparts.length, pg.mr), cl));

  /* ----- blocks ----- */
  const side = st.side, sdw = LM === '4' ? 50 : LM === '2' ? side * 0.85 : side;
  const R = { 1: [0.637, 0.299], 2: [0.66, 0.27], 3: [0.52, 0.24], 4: [0.5, 0.5] }[LM];
  const B = (p) => ({ st, fs, ...p });
  const integ = LM === '2' && ptitle && V('pr');
  const zr = [['הנץ החמה', fmt(z.netz)], ['סוף זמן ק״ש', fmt(z.shma)], ['שקיעת החמה', fmt(z.shkia)], ['צאת הכוכבים', fmt(z.tzeit)]];
  if (z.dow === 5 && z.shkia) zr.push(['הדלקת נרות', fmt(z.shkia.minus({ minutes: st.candle }))]);
  const crown = V('cr') && <Blk {...B({ id: 'cr', t: 'x', b: 2.3, cls: 'crown', fit: false, mult: LM === '3' ? 1.6 : 1, style: LM === '3' ? { padding: '.3em 2.6em' } : null })}>👑 {st.title || syn.name}{sh ? ' · שבת שלום' : ''} 👑</Blk>;
  const hd = V('hd') && (
    <Blk {...B({ id: 'hd', t: 'x', b: 6, cls: 'hd' })}>
      <div className="dt">{integ && <em className="ptl">{ptitle}</em>}<b>{gem(h.d)} ב{monthName(h.raw)}</b><small>{now.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long' })}{integ && st.pSub ? ' · ' + st.pSub : ''}</small></div>
      {V('zm') && <div className="zs">{zr.map(([n, t]) => <div key={n}><small>{n}</small><b>{t}</b></div>)}</div>}
    </Blk>);
  const pr = LM !== '2' && ptitle && V('pr') && (
    <Blk {...B({ id: 'pr', t: 'x', b: 8, cls: 'pr', style: { '--af': FONTS[cf('pr').font] } })}>
      <b>{ptitle}</b>{(st.pSub || pi.sp.length > 0) && <div>{pi.sp.map((x) => <i key={x}>{x}</i>)}{st.pSub && <i>{st.pSub}</i>}</div>}
    </Blk>);
  const cu = V('cu') && <Blk {...B({ id: 'cu', t: 'x', b: 2.6, cls: 'cu', mult: LM === '4' ? 1.3 : 1 })}><span className="cl">💡 מנהגי היום בתפילה:</span>{chips.map((c, i) => <i key={i}>{c}</i>)}</Blk>;
  const mn = <Blk {...B({ id: 'mn', t: 'r', b: LM === '3' ? 52 : 100 - sdw, cls: 'pn mn', share: LM === '3' ? 0.52 : LM === '4' ? 0.5 : R[0] })}>{mid}{!sh && !full && slides.length > 1 && cur && <i className="prg" key={idx + '-' + pg.mr} style={{ '--d': cur.dur + 's' }} />}</Blk>;
  const yzList = mems.length ? mems : null, yc = chunk(yzList || [0], ipp('yz'), pg.yz);
  const yz = V('yz') && (
    <Blk {...B({ id: 'yz', t: 's', b: 3, cls: 'pn yz', share: R[1], style: { fontFamily: FONTS[cf('mem').font] } })}>
      <div className="lb">🕯 לעילוי נשמת</div>
      <div className="pgw fade" key={'yz' + pg.yz}>{yzList ? yc.items.map((m) => <div className="yi" key={m.id}><b>{m.name}</b><small>{!m.mode || m.mode === 'y' ? `${m.gender === 'f' ? 'נפטרה' : 'נפטר'} ${gem(m.d)} ב${monthName(m.month)} • ` : ''}ת.נ.צ.ב.ה</small>{m.desc && <small style={{ display: 'block' }}>{m.desc}</small>}</div>) : <div className="yi"><small>אין הנצחות להיום</small></div>}</div>
      <div className="dots">{yc.pages > 1 ? Array.from({ length: yc.pages }, (_, i) => (i === pg.yz % yc.pages ? '●' : '○')).join(' ') : ''}</div>
    </Blk>);
  const rc = chunk(refs, ipp('rf'), pg.rf);
  const rf = V('rf') && (
    <Blk {...B({ id: 'rf', t: 's', b: 2, cls: 'pn rf', share: R[1], style: { fontFamily: FONTS[cf('rf').font] } })}>
      <div className="lb">🏥 רפואה שלמה</div>
      <div className="pgw fade" key={'rf' + pg.rf}>{refs.length ? rc.items.map((r) => <div className="yi" key={r.id}><b>{r.name}</b>{r.note && <small>{r.note}</small>}</div>) : <div className="yi"><small>אין שמות לרפואה שלמה כרגע</small></div>}</div>
      <div className="dots">{rc.pages > 1 ? Array.from({ length: rc.pages }, (_, i) => (i === pg.rf % rc.pages ? '●' : '○')).join(' ') : ''}</div>
    </Blk>);
  const qr = V('qr') && onS(st.donScreen) && (
    <Blk {...B({ id: 'qr', t: 's', b: 2, cls: 'pn dn', share: R[1] })}>
      <div>{st.donTitle || 'תרומה מהירה לבית הכנסת'}</div>
      <div className="qrw">{st.payUrl ? <div className="qr"><QRCodeSVG value={st.payUrl} size={Math.round(fs * 7 * st.qs / 100)} /></div> : <small>הגדירו קישור תשלום בלשונית גבייה</small>}</div>
      <small>{st.donSub || 'סרקו בנייד לתרומה מאובטחת'}</small>
    </Blk>);
  const bar = Object.entries(grp).map(([k, g]) => <span className="pg" key={k}>{k}:<i>{[...g.t].sort().join(' , ')}</i>{g.n.length > 0 && <small style={{ fontSize: '.55em', fontWeight: 500, marginInlineStart: '.4em' }}>{g.n.join(' · ')}</small>}</span>);
  const pb = <Blk {...B({ id: 'pb', t: 'x', b: 3.5, cls: 'pb' })}>{bar.length ? bar.flatMap((b, i) => (i ? [<span key={'d' + i} style={{ opacity: .6 }}>♦</span>, b] : [b])) : '—'}</Blk>;
  const pbl = <Blk {...B({ id: 'pb', t: 's', b: 3, cls: 'pn pbl', share: R[1] })}><div className="lb">🕍 זמני תפילות</div>{Object.entries(grp).map(([k, g]) => <div className="tr" key={k}><b>{k}</b><i>{[...g.t].sort().join(' , ')}</i></div>)}</Blk>;
  const tk = V('tk') && st.tkText && onS(st.tkScreen) && syn.plan?.features?.runningTicker && <div className="tk"><span>{st.tkText}</span></div>;
  const col = (kids, f) => kids.some(Boolean) && <div className="sd" style={{ flex: f }}>{kids}</div>;

  let body;
  if (LM === '3') body = <>{crown}{hd}{pr}{cu}<div className="bd">{col([yz, rf], 24)}{mn}{col([pbl, qr], 24)}</div>{tk}</>;
  else if (LM === '4') body = <>{crown}{hd}{pr}<div className="bd">{mn}{col([yz, rf, qr], 50)}</div>{cu}{tk}{pb}</>;
  else body = <>{crown}{hd}{pr}{cu}<div className="bd">{mn}{col([yz, rf, qr], sdw)}</div>{tk}{pb}</>;

  const frame = st.vis?.frm === false ? 'clean' : st.frame || 'royal';
  const style = { fontSize: fs, '--u': fs + 'px', ...(st.accent ? { '--dac': st.accent, '--dac2': st.accent } : {}),
    ...(st.bg ? { background: `linear-gradient(${st.theme === 'classic' ? '#fffc,#fffc' : '#000a,#000c'}),url(${st.bg}) center/cover` } : {}) };
  return (
    <div className={`dp ${sh ? 'shb' : ''} fr-${frame}`} data-t={st.theme} data-lm={LM} data-a={st.anim} style={style}>
      <i className="cn a" /><i className="cn b" /><i className="cn c" /><i className="cn d" />
      {body}{full}{popup}
      {status !== 'live' && <span style={{ position: 'absolute', bottom: 4, left: 8, fontSize: 10, opacity: 0.5 }}>● {status === 'cached' ? 'נתונים שמורים' : status === 'error' ? 'שגיאת חיבור' : 'מצב גיבוי'}</span>}
    </div>);
}
