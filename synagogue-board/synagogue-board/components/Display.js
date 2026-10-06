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
  useLayoutEffect(() => {
    const e = ref.current; if (!e || !fit) return;
    const run = () => { const dp = e.closest('.dp'); if (dp && e.clientWidth) e.style.fontSize = (fs * e.clientWidth / (dp.clientWidth * share)) * mult + 'px'; };
    run(); const ro = new ResizeObserver(run); ro.observe(e); ro.observe(e.closest('.dp'));
    return () => ro.disconnect();
  }, [fs, share, mult, fit, st]);
  return <div ref={ref} className={cls} style={{ ...blockStyle(st, id, t, b), ...style }}>{children}</div>;
}

const chunk = (arr, n, p) => { const pages = Math.max(1, Math.ceil(arr.length / n)); return { pages, items: arr.slice((p % pages) * n, (p % pages) * n + n) }; };

export default function Display({ sid, screenId }) {
  const { syn, cols } = useSynagogue(sid);
  const [now, setNow] = useState(() => new Date());
  const [size, setSize] = useState({ w: 1280, h: 720 });
  useEffect(() => { const u = () => setSize({ w: innerWidth, h: innerHeight }); u(); addEventListener('resize', u); return () => removeEventListener('resize', u); }, []);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  if (!syn) return <div className="dp"><p style={{ margin: 'auto' }}>{syn === null ? 'בית הכנסת לא נמצא' : 'טוען…'}</p></div>;
  if (syn.suspended) return <div className="dp"><div style={{ margin: 'auto', textAlign: 'center' }}><h1>⏸ המסך מושהה</h1><p>השירות לבית כנסת זה הושהה זמנית. לפרטים פנו למנהל המערכת.</p></div></div>;
  return <Inner syn={syn} cols={cols} screenId={screenId} now={now} size={size} />;
}

function Inner({ syn, cols, screenId, now, size }) {
  const st = { ...DEFAULT_SETTINGS, ...syn.settings };
  const z = getZmanim(now, syn.location || { lat: 31.77, lng: 35.21 }, st.shma);
  const sh = isShabbat(z, st.candle, st.force);
  const h = hebOf(now, !!z.shkia && z.now >= z.shkia);
  const LM = st.layout || '1';
  const fs = (size.h > size.w ? size.w / 52 : Math.min(size.w / 72, size.h / 40)) * st.zoom;
  const cf = (k) => ({ font: 'david', size: 18, secs: 10, ...(st.cf || {})[k] });
  const afs = (k) => ({ '--af': FONTS[cf(k).font], fontSize: cf(k).size / 18 + 'em' });
  const V = (k) => (st.vis || {})[k] !== false;
  const ipp = (k) => Math.max(1, st.ipp?.[k] || 3);
  const [idx, setIdx] = useState(0);
  const [pg, setPg] = useState({ yz: 0, rf: 0, mr: 0 });

  /* ----- content ----- */
  const pi = parshaInfo(now, z.dow, !!z.tzeit && z.now >= z.tzeit);
  const ptitle = st.pMode === 'manual' && st.pTitle ? st.pTitle : pi.title;
  const anns = (cols.announcements || []).filter((a) => a.on && (a.screen === 'all' || a.screen === screenId) && annOn(a, h));
  const mems = (cols.memorials || []).filter((m) => memOn(m, h));
  const refs = (cols.refuah || []).filter((r) => refuahOn(r, h));
  const hal = (cols.halacha || []).filter((x) => x.on);
  const dt = dayType(sh, z.dow);
  const rows0 = (cols.prayers || []).filter((r) => r.days === 'all' || r.days === dt || (dt !== 'shab' && r.days === 'week'));
  const fw = (r) => r.name.split(' ')[0];
  const spec = new Set(rows0.filter((r) => r.days === dt && dt !== 'week').map(fw));
  const rcm = (h.d === 1 && h.raw !== 'Tishri') || h.d === 30;
  const ovr = (r) => (cols.overrides || []).find((o) => o.prayerId === r.id && (o.kind === 'rc' ? rcm : o.kind === 'h' && o.day === h.d && (o.month === h.raw || (o.month === 'Adar' && h.raw === 'Adar II'))));
  const grp = {};
  rows0.filter((r) => !(r.days === 'week' && spec.has(fw(r)))).forEach((r) => { (grp[fw(r)] ||= { t: [], n: [] }); grp[fw(r)].t.push(ovr(r)?.time || prayerTime(r, z)); if (r.note) grp[fw(r)].n.push(r.note); });
  const cMode = st.customs?.mode || 'auto', manual = (st.customs?.text || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const auto = [...holNames(now, !!z.shkia && z.now >= z.shkia), ...reminders(h)];
  const chips = cMode === 'manual' ? manual : cMode === 'both' ? [...auto, ...manual] : auto;

  const slides = [];
  if (st.pSlide && V('pr')) slides.push({ k: 'p', dur: cf('pr').secs });
  anns.forEach((a) => slides.push({ k: 'a', a, dur: cf('ann').secs }));
  if (V('memPop')) mems.filter((m) => (!m.mode || m.mode === 'y')).forEach((m) => slides.push({ k: 'm', m, dur: cf('mem').secs }));
  if (V('rf') && V('rfPop') && refs.length) slides.push({ k: 'r', dur: cf('rf').secs });
  if (st.hl.mode !== 'off') {
    if (st.hl.auto) slides.push({ k: 'h', t: 'מנהגי היום', x: reminders(h), dur: cf('hal').secs });
    hal.forEach((x) => slides.push({ k: 'h', t: x.title, x: [x.text], dur: cf('hal').secs }));
  }
  const cur = slides[idx % (slides.length || 1)];
  const mrPages = Math.max(1, Math.ceil(refs.length / ipp('rf')));

  /* ----- carousel (frozen on Shabbat) ----- */
  useEffect(() => {
    if (sh || !slides.length) return;
    const t = setTimeout(() => {
      if (cur?.k === 'r' && pg.mr < mrPages - 1) setPg((p) => ({ ...p, mr: p.mr + 1 }));
      else { setPg((p) => ({ ...p, mr: 0 })); setIdx((i) => i + 1); }
    }, (cur?.dur || 10) * 1000);
    return () => clearTimeout(t);
  }, [idx, pg.mr, slides.length, sh, mrPages]); // eslint-disable-line
  const yzPages = Math.max(1, Math.ceil(Math.max(mems.length, 1) / ipp('yz'))), rfPages = Math.max(1, Math.ceil(refs.length / ipp('rf')));
  useEffect(() => { if (yzPages < 2) return; const t = setInterval(() => setPg((p) => ({ ...p, yz: p.yz + 1 })), cf('mem').secs * 1000); return () => clearInterval(t); }, [yzPages, cf('mem').secs]); // eslint-disable-line
  useEffect(() => { if (rfPages < 2) return; const t = setInterval(() => setPg((p) => ({ ...p, rf: p.rf + 1 })), cf('rf').secs * 1000); return () => clearInterval(t); }, [rfPages, cf('rf').secs]); // eslint-disable-line

  /* ----- heartbeat for the admin "screen health" indicator ----- */
  const showing = cur ? (cur.a?.title || cur.m?.name || cur.t || (cur.k === 'r' ? 'רפואה שלמה' : 'פרשה')) : '—';
  useEffect(() => {
    const beat = () => setDoc(doc(db, 'synagogues', syn.id, 'screens', screenId), { lastSeen: serverTimestamp(), showing, index: Math.max(0, SCREENS.indexOf(screenId)) }, { merge: true }).catch(() => {});
    beat(); const t = setInterval(beat, sh ? 60000 : 15000); return () => clearInterval(t);
  }, [syn.id, screenId, showing, sh]);

  /* ----- slide content ----- */
  let mid = null, full = null;
  if (sh) mid = (<><div className="lb">✦ הודעות לשבת ✦</div>{anns.map((a) => <div className="ai" key={a.id}><h3>{a.title}</h3><p>{a.content}</p></div>)}</>);
  else if (!cur) mid = <div className="an"><div className="lb">✦ ברוכים הבאים ✦</div><h3>{syn.name}</h3></div>;
  else if (cur.k === 'a') mid = <div className="an fade" key={idx} style={afs('ann')}><div className="lb">✦ הודעת הגבאי והנהלת בית הכנסת ✦</div><h3>{cur.a.title}</h3><p>{cur.a.content}</p></div>;
  else if (cur.k === 'm') mid = <div className="an fade" key={idx} style={afs('mem')}><div className="lb">🕯 לעילוי נשמת</div><h3>{cur.m.name}</h3><p>{cur.m.gender === 'f' ? 'נפטרה' : 'נפטר'} {gem(cur.m.d)} ב{monthName(cur.m.month)}{cur.m.desc && <><br />{cur.m.desc}</>}</p></div>;
  else if (cur.k === 'p') mid = <div className="an fade" key={idx} style={afs('pr')}><div className="lb">✦ פרשת השבוע ✦</div><h3>{ptitle}</h3>{st.pSub && <p>{st.pSub}</p>}</div>;
  else if (cur.k === 'r') { const c = chunk(refs, ipp('rf'), pg.mr); mid = <div className="an fade" key={idx + '-' + pg.mr} style={afs('rf')}><div className="lb">🏥 רפואה שלמה</div><div className="pgw">{c.items.map((r) => <p key={r.id}><b>{r.name}</b>{r.note ? ' · ' + r.note : ''}</p>)}</div><div className="dots">{c.pages > 1 ? Array.from({ length: c.pages }, (_, i) => (i === pg.mr % c.pages ? '●' : '○')).join(' ') : ''}</div></div>; }
  else { const hh = (<><div className="lb">📖 הלכה ומנהגים</div><h3>{cur.t}</h3>{cur.x.map((t, i) => <p key={i}>{t}</p>)}</>); if (st.hl.mode === 'full') full = <div className="fsl an fade" key={idx} style={afs('hal')}>{hh}</div>; else mid = <div className="an fade" key={idx} style={afs('hal')}>{hh}</div>; }

  /* ----- blocks ----- */
  const side = st.side, sdw = LM === '4' ? 50 : LM === '2' ? side * 0.85 : side;
  const R = { 1: [0.637, 0.299], 2: [0.66, 0.27], 3: [0.52, 0.24], 4: [0.5, 0.5] }[LM];
  const B = (p) => ({ st, fs, ...p });
  const integ = LM === '2' && ptitle && V('pr');
  const zr = [['הנץ החמה', fmt(z.netz)], ['סוף זמן ק״ש', fmt(z.shma)], ['שקיעת החמה', fmt(z.shkia)], ['צאת הכוכבים', fmt(z.tzeit)]];
  if (z.dow === 5 && z.shkia) zr.push(['הדלקת נרות', fmt(z.shkia.minus({ minutes: st.candle }))]);
  const crown = V('cr') && <Blk {...B({ id: 'cr', t: 'x', b: 2.3, cls: 'crown', fit: false, style: LM === '3' ? { fontSize: '1.6em', padding: '.3em 2.6em' } : null })}>👑 {st.title || syn.name}{sh ? ' · שבת שלום' : ''} 👑</Blk>;
  const hd = V('hd') && (
    <Blk {...B({ id: 'hd', t: 'x', b: 6, cls: 'hd' })}>
      <div className="dt">{integ && <em className="ptl">{ptitle}</em>}<b>{gem(h.d)} ב{monthName(h.raw)}</b><small>{now.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long' })}{integ && st.pSub ? ' · ' + st.pSub : ''}</small></div>
      {V('zm') && <div className="zs">{zr.map(([n, t]) => <div key={n}><small>{n}</small><b>{t}</b></div>)}</div>}
    </Blk>);
  const pr = LM !== '2' && ptitle && V('pr') && (
    <Blk {...B({ id: 'pr', t: 'x', b: 8, cls: 'pr', mult: cf('pr').size / 18, style: { '--af': FONTS[cf('pr').font] } })}>
      <b>{ptitle}</b>{(st.pSub || pi.sp.length > 0) && <div>{pi.sp.map((x) => <i key={x}>{x}</i>)}{st.pSub && <i>{st.pSub}</i>}</div>}
    </Blk>);
  const cu = V('cu') && <Blk {...B({ id: 'cu', t: 'x', b: 2.6, cls: 'cu', mult: LM === '4' ? 1.3 : 1 })}><span className="cl">💡 מנהגי היום בתפילה:</span>{chips.map((c, i) => <i key={i}>{c}</i>)}</Blk>;
  const mn = <Blk {...B({ id: 'mn', t: 'r', b: LM === '3' ? 52 : 100 - sdw, cls: 'pn mn', share: LM === '3' ? 0.52 : LM === '4' ? 0.5 : R[0] })}>{mid}{!sh && !full && slides.length > 1 && cur && <i className="prg" key={idx + '-' + pg.mr} style={{ '--d': cur.dur + 's' }} />}</Blk>;
  const yzList = mems.length ? mems : null, yc = chunk(yzList || [0], ipp('yz'), pg.yz);
  const yz = V('yz') && (
    <Blk {...B({ id: 'yz', t: 's', b: 3, cls: 'pn yz', share: R[1], mult: cf('mem').size / 18, style: { fontFamily: FONTS[cf('mem').font] } })}>
      <div className="lb">🕯 לעילוי נשמת</div>
      <div className="pgw fade" key={'yz' + pg.yz}>{yzList ? yc.items.map((m) => <div className="yi" key={m.id}><b>{m.name}</b><small>{!m.mode || m.mode === 'y' ? `${m.gender === 'f' ? 'נפטרה' : 'נפטר'} ${gem(m.d)} ב${monthName(m.month)} • ` : ''}ת.נ.צ.ב.ה</small>{m.desc && <small style={{ display: 'block' }}>{m.desc}</small>}</div>) : <div className="yi"><small>אין הנצחות להיום</small></div>}</div>
      <div className="dots">{yc.pages > 1 ? Array.from({ length: yc.pages }, (_, i) => (i === pg.yz % yc.pages ? '●' : '○')).join(' ') : ''}</div>
    </Blk>);
  const rc = chunk(refs, ipp('rf'), pg.rf);
  const rf = V('rf') && refs.length > 0 && (
    <Blk {...B({ id: 'rf', t: 's', b: 2, cls: 'pn rf', share: R[1], mult: cf('rf').size / 18, style: { fontFamily: FONTS[cf('rf').font] } })}>
      <div className="lb">🏥 רפואה שלמה</div>
      <div className="pgw fade" key={'rf' + pg.rf}>{rc.items.map((r) => <div className="yi" key={r.id}><b>{r.name}</b>{r.note && <small>{r.note}</small>}</div>)}</div>
      <div className="dots">{rc.pages > 1 ? Array.from({ length: rc.pages }, (_, i) => (i === pg.rf % rc.pages ? '●' : '○')).join(' ') : ''}</div>
    </Blk>);
  const qr = V('qr') && st.payUrl && (
    <Blk {...B({ id: 'qr', t: 's', b: 2, cls: 'pn dn', share: R[1] })}>
      <div>{st.donTitle || 'תרומה מהירה לבית הכנסת'}</div>
      <div className="qr"><QRCodeSVG value={st.payUrl} size={Math.round(fs * 7 * st.qs / 100)} /></div>
      <small>{st.donSub || 'סרקו בנייד לתרומה מאובטחת'}</small>
    </Blk>);
  const bar = Object.entries(grp).map(([k, g]) => <span className="pg" key={k}>{k}:<i>{[...g.t].sort().join(' , ')}</i>{g.n.length > 0 && <small style={{ fontSize: '.55em', fontWeight: 500, marginInlineStart: '.4em' }}>{g.n.join(' · ')}</small>}</span>);
  const pb = <Blk {...B({ id: 'pb', t: 'x', b: 3.5, cls: 'pb' })}>{bar.length ? bar.flatMap((b, i) => (i ? [<span key={'d' + i} style={{ opacity: .6 }}>♦</span>, b] : [b])) : '—'}</Blk>;
  const pbl = <Blk {...B({ id: 'pb', t: 's', b: 3, cls: 'pn pbl', share: R[1] })}><div className="lb">🕍 זמני תפילות</div>{Object.entries(grp).map(([k, g]) => <div className="tr" key={k}><b>{k}</b><i>{[...g.t].sort().join(' , ')}</i></div>)}</Blk>;
  const tk = V('tk') && st.tkText && syn.plan?.features?.runningTicker && <div className="tk"><span>{st.tkText}</span></div>;
  const col = (kids, f) => kids.some(Boolean) && <div className="sd" style={{ flex: f }}>{kids}</div>;

  let body;
  if (LM === '3') body = <>{crown}{hd}{pr}{cu}<div className="bd">{col([yz, rf], 24)}{mn}{col([pbl, qr], 24)}</div>{tk}</>;
  else if (LM === '4') body = <>{crown}{hd}{pr}<div className="bd">{mn}{col([yz, rf, qr], 50)}</div>{cu}{tk}{pb}</>;
  else body = <>{crown}{hd}{pr}{cu}<div className="bd">{mn}{col([yz, rf, qr], sdw)}</div>{tk}{pb}</>;

  const style = { fontSize: fs, '--u': fs + 'px', ...(st.accent ? { '--dac': st.accent, '--dac2': st.accent } : {}),
    ...(st.bg ? { background: `linear-gradient(${st.theme === 'classic' ? '#fffc,#fffc' : '#000a,#000c'}),url(${st.bg}) center/cover` } : {}) };
  return (
    <div className={`dp ${sh ? 'shb' : ''} ${V('frm') ? '' : 'nofrm'}`} data-t={st.theme} data-lm={LM} data-a={st.anim} style={style}>
      <i className="cn a" /><i className="cn b" /><i className="cn c" /><i className="cn d" />
      {body}{full}
    </div>);
}
