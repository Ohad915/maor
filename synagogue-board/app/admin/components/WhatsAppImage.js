'use client';
import { useRef, useState } from 'react';
import { fmt, getZmanim, prayerTime, zOpts } from '@/lib/zmanim';
import { annOn, gem, hebOf, monthName, parshaInfo, rdOf } from '@/lib/hebrew';
import { haftaraHe } from '@/lib/haftara';
import { Card, Switch } from './UI';

const TPL = [['temple', 'מקדש וספר תורה ספרדי (ברירת מחדל)'], ['kotel', 'אבני הכותל ועץ זית'], ['classic', 'זהב ונר קלאסי']];
const GOLD = 'linear-gradient(135deg,#f6d77a,#a8761a 50%,#f6d77a)';
const THEME = {
  temple: { bg: 'radial-gradient(120% 70% at 50% 0,#22398a,#0c1538 55%,#050a20)', fg: '#f7ecc8', ac: '#f2c85b', card: 'rgba(255,255,255,.07)', ln: '#d9b657' },
  classic: { bg: 'radial-gradient(120% 70% at 50% 0,#1d2f6b,#0b1230 55%,#05081a)', fg: '#f7ecc8', ac: '#f2c85b', card: 'rgba(255,255,255,.07)', ln: '#d9b657' },
  kotel: { bg: 'repeating-linear-gradient(0deg,transparent 0 118px,#8a6a42 118px 121px),repeating-linear-gradient(90deg,transparent 0 210px,#8a6a42 210px 213px),linear-gradient(135deg,#ead9b8,#c9ad80 50%,#e3cfa8)', fg: '#3b2a14', ac: '#7a4a0c', card: 'rgba(255,248,230,.85)', ln: '#8a6a42' },
};

/* ---------- illustrations (inline SVG: light, crisp, no image files) ---------- */
const GD = <defs>
  <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbe7a1" /><stop offset=".5" stopColor="#c9941f" /><stop offset="1" stopColor="#f6d77a" /></linearGradient>
  <linearGradient id="gm" x1="0" x2="1"><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#c9c9d6" /><stop offset="1" stopColor="#f4f4fa" /></linearGradient></defs>;

/** Ornate golden frame around the whole poster: double gold line, beaded rail, corner medallions and mid-edge ornaments. */
function Frame({ W, H, color }) {
  const mid = [[W / 2, 22], [W / 2, H - 22], [22, H / 2], [W - 22, H / 2]];
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{GD}
      <rect x="10" y="10" width={W - 20} height={H - 20} rx="22" fill="none" stroke="url(#gg)" strokeWidth="14" />
      <rect x="26" y="26" width={W - 52} height={H - 52} rx="14" fill="none" stroke={color} strokeWidth="3" />
      <rect x="36" y="36" width={W - 72} height={H - 72} rx="10" fill="none" stroke="url(#gg)" strokeWidth="5" strokeDasharray="1 13" strokeLinecap="round" />
      {[[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]].map(([x, y]) => <g key={x + '-' + y} transform={`translate(${x} ${y})`}>
        <circle r="34" fill="url(#gg)" stroke="#7a5410" strokeWidth="3" /><circle r="22" fill="none" stroke="#fff3c4" strokeWidth="2" />
        <path d="M0-16l9 16-9 16-9-16z" fill="#7a5410" /><circle r="4" fill="#fff3c4" /></g>)}
      {mid.map(([x, y]) => <g key={x + '-' + y} transform={`translate(${x} ${y})`}><path d="M0-18l16 18-16 18-16-18z" fill="url(#gg)" stroke="#7a5410" strokeWidth="2" /><circle r="5" fill="#7a5410" /></g>)}
    </svg>);
}
/** Temple facade like the sample: gold pediment with marble inlay, four marble columns with gold capitals, dark-blue sign between them. */
function Temple({ W = 940, H = 400 }) {
  const col = (x) => <g key={x}>
    <rect x={x - 30} y="150" width="60" height="16" rx="4" fill="url(#gg)" stroke="#7a5410" strokeWidth="2" />
    <path d={`M${x - 26} 150c-8-14 4-22 12-16 2-10 22-10 24 0 8-6 20 2 12 16z`} fill="url(#gg)" stroke="#7a5410" strokeWidth="2" />
    <rect x={x - 20} y="166" width="40" height={H - 206} fill="url(#gm)" /><rect x={x - 10} y="166" width="3" height={H - 206} fill="#9a9ab0" opacity=".5" /><rect x={x + 6} y="166" width="3" height={H - 206} fill="#9a9ab0" opacity=".5" />
    <path d={`M${x - 8} 220l10 40 8-20 8 50`} stroke="#d5b66a" strokeWidth="2" fill="none" opacity=".7" />
    <rect x={x - 28} y={H - 40} width="56" height="16" rx="3" fill="url(#gg)" stroke="#7a5410" strokeWidth="2" /></g>;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{GD}
      <rect x={W * 0.2} y="150" width={W * 0.6} height={H - 190} fill="#0a1a52" />
      <path d={`M${W * 0.2} 150 Q${W / 2} 40 ${W * 0.8} 150z`} fill="#122a78" stroke="url(#gg)" strokeWidth="5" />
      <path d={`M30 150 L${W / 2} 6 L${W - 30} 150 Z`} fill="url(#gg)" stroke="#7a5410" strokeWidth="3" />
      <path d={`M70 146 L${W / 2} 28 L${W - 70} 146 Z`} fill="url(#gm)" stroke="#7a5410" strokeWidth="2" />
      <path d={`M${W * 0.2} 146 Q${W / 2} 36 ${W * 0.8} 146 L${W * 0.8} 150 L${W * 0.2} 150z`} fill="#0a1a52" stroke="url(#gg)" strokeWidth="5" />
      <path d={`M${W / 2 - 40} 54 q40-34 80 0 q-40 24-80 0z`} fill="url(#gg)" stroke="#7a5410" strokeWidth="2" />
      <rect x="20" y="148" width={W - 40} height="14" rx="3" fill="url(#gg)" stroke="#7a5410" strokeWidth="2" />
      {[150, 255].map(col)}{[W - 255, W - 150].map(col)}
      <rect x="40" y={H - 26} width={W - 80} height="12" fill="url(#gm)" stroke="#9a9ab0" /><rect x="10" y={H - 14} width={W - 20} height="14" fill="url(#gm)" stroke="#9a9ab0" />
    </svg>);
}
const Leaf = ({ x, y, r, c }) => <ellipse cx={x} cy={y} rx="26" ry="8" fill={c} stroke="#7a5410" strokeWidth="1.5" transform={`rotate(${r} ${x} ${y})`} />;
function Laurel({ flip }) { // golden olive branch beside the scroll
  return <svg width="180" height="330" viewBox="-30 0 180 330" style={{ transform: flip ? 'scaleX(-1)' : 'none' }}>{GD}
    <path d="M110 320 Q10 200 70 10" fill="none" stroke="#a8761a" strokeWidth="6" strokeLinecap="round" />
    {Array.from({ length: 10 }, (_, i) => { const y = 300 - i * 28, x = 98 - Math.sin(i / 10 * 2.4) * 70; return <g key={i}><Leaf x={x - 22} y={y} r={-35} c="url(#gg)" /><Leaf x={x + 18} y={y - 12} r={30} c="url(#gg)" /></g>; })}
    <Leaf x="66" y="8" r="-80" c="url(#gg)" /></svg>;
}
/** Ornate silver-and-gold scroll roller with finials. */
function Roller({ x, H }) {
  return <g>
    <rect x={x - 38} y="104" width="76" height={H - 150} rx="26" fill="url(#gs)" stroke="#7a5410" strokeWidth="4" />
    <rect x={x - 28} y="124" width="56" height={H - 190} rx="18" fill="none" stroke="url(#gg)" strokeWidth="5" />
    {Array.from({ length: 5 }, (_, i) => <g key={i} transform={`translate(${x} ${160 + i * ((H - 270) / 4)})`}><path d="M0-16c14 0 18 14 4 18-12 3-8-10 0-8" fill="none" stroke="#b8861f" strokeWidth="4" /><path d="M0-16c-14 0-18 14-4 18 12 3 8-10 0-8" fill="none" stroke="#b8861f" strokeWidth="4" /><circle r="4" fill="#c9941f" cy="22" /></g>)}
    <rect x={x - 44} y="92" width="88" height="22" rx="8" fill="url(#gg)" stroke="#7a5410" strokeWidth="3" /><rect x={x - 44} y={H - 62} width="88" height="22" rx="8" fill="url(#gg)" stroke="#7a5410" strokeWidth="3" />
    <path d={`M${x - 10} ${H - 40} q10 40 20 0z`} fill="url(#gg)" stroke="#7a5410" strokeWidth="3" /><circle cx={x} cy={H - 6} r="12" fill="url(#gg)" stroke="#7a5410" strokeWidth="3" />
    <circle cx={x} cy="84" r="12" fill="url(#gg)" stroke="#7a5410" strokeWidth="3" /></g>;
}
/** Torah scroll: two ornate rollers around a parchment, royal crown on top. Children are placed on the parchment. */
function TorahCase({ children, W = 800, H = 400 }) {
  const px = 160, pw = W - 2 * px;
  return (
    <div style={{ position: 'relative', width: W, height: H, margin: '0 auto' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>{GD}
        <defs><linearGradient id="gs" x1="0" x2="1"><stop offset="0" stopColor="#8d8f99" /><stop offset=".35" stopColor="#f2f2f6" /><stop offset=".7" stopColor="#b9bbc6" /><stop offset="1" stopColor="#7d7f8a" /></linearGradient>
          <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7ecd0" /><stop offset=".5" stopColor="#fdf6e3" /><stop offset="1" stopColor="#ecdcb4" /></linearGradient></defs>
        <rect x={px} y="100" width={pw} height={H - 140} fill="url(#gp)" stroke="#a8761a" strokeWidth="2" /><rect x={px} y="100" width={pw} height="16" fill="#00000018" /><rect x={px} y={H - 56} width={pw} height="16" fill="#00000018" />
        <Roller x={px - 6} H={H} /><Roller x={W - px + 6} H={H} />
        <g transform={`translate(${W / 2} 0)`}>
          <path d="M-70 92 L-80 40 Q0 16 80 40 L70 92z" fill="#142d86" stroke="#7a5410" strokeWidth="3" /><path d="M-70 92 L-80 40 L-40 60 L0 28 L40 60 L80 40 L70 92z" fill="#1d3ba8" stroke="#7a5410" strokeWidth="2" />
          <rect x="-84" y="84" width="168" height="22" rx="6" fill="url(#gg)" stroke="#7a5410" strokeWidth="3" />
          {[-60, -30, 0, 30, 60].map((x) => <circle key={x} cx={x} cy="95" r="5" fill="#fff" stroke="#c9b27a" />)}
          {[[-38, 'm', '#d33a4a'], [0, 'm', '#2b6fe0'], [38, 'm', '#d33a4a']].map(([x, , c]) => <circle key={x} cx={x} cy="68" r="7" fill={c} stroke="#7a5410" strokeWidth="2" />)}
          <circle cx="-84" cy="46" r="8" fill="url(#gg)" stroke="#7a5410" strokeWidth="2" /><circle cx="84" cy="46" r="8" fill="url(#gg)" stroke="#7a5410" strokeWidth="2" />
          <rect x="-5" y="6" width="10" height="26" fill="url(#gg)" stroke="#7a5410" strokeWidth="2" /><rect x="-13" y="14" width="26" height="9" fill="url(#gg)" stroke="#7a5410" strokeWidth="2" /></g>
      </svg>
      <div style={{ position: 'absolute', left: px + 14, top: 130, width: pw - 28, height: H - 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#1b1204' }}>{children}</div>
    </div>);
}
function Olive() { return <svg width="300" height="70" viewBox="0 0 300 70"><path d="M5 40 Q150 5 295 40" fill="none" stroke="#5b6b2a" strokeWidth="4" />{Array.from({ length: 14 }, (_, i) => <ellipse key={i} cx={20 + i * 20} cy={i % 2 ? 28 : 46} rx="14" ry="5" fill="#7a8a3a" />)}</svg>; }
/** Row icons, drawn in gold. */
function Ico({ k }) {
  const f = '#f2c85b', P = { width: 54, height: 54, viewBox: '0 0 48 48', fill: 'none', stroke: f, strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (k === 'candle') return <svg {...P}><path d="M24 4c5 6 5 10 0 13-5-3-5-7 0-13z" fill={f} /><rect x="19" y="20" width="10" height="22" rx="2" /></svg>;
  if (k === 'sun') return <svg {...P}><circle cx="24" cy="26" r="9" fill={f} /><path d="M24 6v6M8 26h6M34 26h6M12 14l4 4M36 14l-4 4M6 42h36" /></svg>;
  if (k === 'moon') return <svg {...P}><path d="M32 8a16 16 0 1 0 8 28A14 14 0 0 1 32 8z" fill={f} /></svg>;
  if (k === 'star') return <svg {...P}><path d="M24 5l5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1z" fill={f} /></svg>;
  if (k === 'shul') return <svg {...P}><path d="M6 42V22l18-14 18 14v20zM18 42V28h12v14" /></svg>;
  return <svg {...P}><path d="M8 10h14a4 4 0 0 1 4 4v26a4 4 0 0 0-4-4H8zM40 10H26" /><path d="M40 10v26H26" /></svg>; // book
}
const iconOf = (n) => /נרות/.test(n) ? 'candle' : /מנחה|שיעור|גמרא|דף|תהילים|פרק|לימוד/.test(n) ? 'book' : /ערבית|מעריב|שקיעה/.test(n) ? 'moon' : /צאת|רבינו/.test(n) ? 'star' : /נץ|שחרית|זריחה|ק״ש|שמע|חצות/.test(n) ? 'sun' : 'shul';

/* ---------- data ---------- */
async function build({ syn, cols, st }, kind, opt) {
  const loc = syn.location || { lat: 31.77, lng: 35.21, elevation: 0 }, zo = { ...zOpts(st), rt: opt.rt, visible: opt.netz };
  const now = new Date(), z0 = getZmanim(now, loc, zo), hn = hebOf(now, false);
  let ahead = (6 - z0.dow + 7) % 7; if (z0.dow === 6 && z0.tzeit && z0.now >= z0.tzeit) ahead = 7;
  const sat = new Date(+now + ahead * 864e5), fri = new Date(+sat - 864e5), zs = getZmanim(sat, loc, zo), zf = getZmanim(fri, loc, zo);
  const pr = (cols.prayers || []).filter((r) => (r.show ?? 'bar') !== 'off');
  const grp = (days, z) => Object.entries(pr.filter((r) => days.includes(r.days)).reduce((a, r) => { (a[r.name] ||= []).push(prayerTime(r, z)); return a; }, {})).map(([n, t]) => [n, t.sort().join(' , ')]);
  const lessons = opt.lessons ? (cols.lessons || []).filter((l) => l.showWa && (l.mode ?? 'block') !== 'off' && (kind === 'shabbat' ? ['shab', 'all'] : ['week', 'all']).includes(l.days)).map((l) => ({ t: l.title, who: [l.rabbi, l.place].filter(Boolean).join(' · '), time: prayerTime(l, kind === 'shabbat' ? zs : z0) })) : [];
  const ann = opt.ann ? (cols.announcements || []).filter((a) => (a.mode ?? (a.on === false ? 'off' : 'block')) !== 'off' && annOn(a, hn)).slice(0, 3).map((a) => a.title + ((a.content || '').split('\n')[0] ? ' · ' + a.content.split('\n')[0].slice(0, 56) : '')) : [];
  const sel = (z) => (zo.shma === 'mga' ? ['סוף זמן ק״ש (מג״א)', fmt(z.shmaMga)] : ['סוף זמן ק״ש', fmt(z.shma)]);
  const base = { name: st.title || syn.name, lessons, ann };
  if (kind === 'shabbat') {
    const pi = parshaInfo(sat, 6, false), hs = hebOf(sat, false);
    const haf = st.waHaftara === false ? '' : st.hfText || (await haftaraHe(rdOf(sat), syn.nusach));
    return { ...base, kind, parsha: st.waParsha === false ? '' : pi.title, special: pi.sp.join(' · '), chag: !pi.title.startsWith('פרשת'), haftara: haf, date: `${gem(hs.d)} ב${monthName(hs.raw)} ה׳${gem(hs.y % 1000)}`,
      times: [['הדלקת נרות', zf.shkia && fmt(zf.shkia.minus({ minutes: st.candle }))], opt.netz && ['הנץ החמה', fmt(zs.netz)], sel(zs), ['שקיעה', fmt(zs.shkia)], ['צאת השבת', fmt(zs.tzeit)], opt.rt && ['רבינו תם', fmt(zs.rt)]].filter(Boolean),
      groups: [['ערב שבת', grp(['fri'], zf)], ['שבת', grp(['shab', 'all'], zs)], ['מוצאי שבת', grp(['mots'], zs)]].filter(([, r]) => r.length) };
  }
  return { ...base, kind, parsha: '', date: `${gem(hn.d)} ב${monthName(hn.raw)} ה׳${gem(hn.y % 1000)}`,
    times: [opt.netz && ['הנץ החמה', fmt(z0.netz)], sel(z0), ['חצות היום', fmt(z0.chatzot)], ['שקיעה', fmt(z0.shkia)], ['צאת הכוכבים', fmt(z0.tzeit)], opt.rt && ['רבינו תם', fmt(z0.rt)]].filter(Boolean),
    groups: [['תפילות ימי חול', grp(['week', 'all'], z0)]].filter(([, r]) => r.length) };
}

/** Ordered rows [label, time] in the sample's logic (candle lighting, mincha, netz, shacharit, shma, lessons, arvit, tzeit...). */
function orderRows(d) {
  const T = (re) => d.times.filter(([n]) => re.test(n)), G = (title) => (d.groups.find(([t]) => t === title) || [, []])[1];
  const dup = {}; d.groups.forEach(([, r]) => r.forEach(([n]) => { dup[n] = (dup[n] || 0) + 1; }));
  const gr = (title) => G(title).map(([n, v]) => [dup[n] > 1 ? `${n} · ${title}` : n, v]);
  const L = d.lessons.map((l) => [`${l.t}${l.who ? ' · ' + l.who : ''}`, l.time]);
  if (d.kind === 'shabbat') return [...T(/נרות/), ...gr('ערב שבת'), ...T(/נץ/), ...gr('שבת'), ...T(/ק״ש/), ...L, ...gr('מוצאי שבת'), ...T(/צאת/), ...T(/רבינו/)].filter(([, v]) => v);
  return [...T(/נץ/), ...gr('תפילות ימי חול'), ...T(/ק״ש/), ...L, ...T(/חצות/), ...T(/שקיעה/), ...T(/צאת/), ...T(/רבינו/)].filter(([, v]) => v);
}
/** thin inner line of a card (a real border: html2canvas does not paint inset shadows correctly) */
const Inner = () => <i style={{ position: 'absolute', inset: 3, border: '2px solid #7a5410', borderRadius: 8, pointerEvents: 'none' }} />;
function Poster({ d, tpl, greet, pref }) {
  const t = THEME[tpl], shab = d.kind === 'shabbat', W = 1080, H = 1920, dark = tpl !== 'kotel';
  const g = !shab ? 'יום מבורך!' : greet === 'chag' || (greet === 'auto' && d.chag) ? 'חג שמח!' : 'שבת שלום ומבורך!';
  const all = orderRows(d), KEY = /נרות|נץ|ק״ש|צאת|חצות|שקיעה|רבינו/, MAXR = 14
  // more than 14 rows: the key zmanim stay, the remaining slots go to the first prayers/lessons (in their original order)
  let free = MAXR - all.filter(([n]) => KEY.test(n)).length;
  const rows = all.length <= MAXR ? all : all.filter(([n]) => KEY.test(n) || free-- > 0), n = Math.max(rows.length, 1), gap = n > 12 ? 4 : n > 10 ? 5 : n > 8 ? 7 : 8
  // the rows area is ~730px: row height / font shrink with the number of rows (never below 44px), so nothing is cut or overlaps
  const rh = Math.max(44, Math.min(78, Math.floor((730 - gap * (n - 1)) / n))), fs = Math.round(Math.min(40, rh * 0.47));
  const nm = (d.name || '').replace(/^בית (ה)?כנסת\s+/, '').trim() || d.name, nfs = nm.length <= 8 ? 104 : nm.length <= 12 ? 84 : nm.length <= 18 ? 64 : 50;
  const box = { position: 'relative', background: 'linear-gradient(180deg,#0d2257,#071538)', border: '3px solid #d9b657', borderRadius: 12, boxShadow: '0 3px 8px #0007', color: '#f7e7b0', display: 'flex', alignItems: 'center', justifyContent: 'center', height: rh };
  const gold = { color: '#f6d77a', textShadow: '0 3px 0 #7a5410, 0 6px 10px #0009', fontWeight: 900 };
  const pn = d.parsha.startsWith('פרשת ') ? d.parsha.slice(5) : d.parsha;
  return (
    <div ref={pref} dir="rtl" style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: t.bg, color: t.fg, fontFamily: "'Frank Ruhl Libre','David Libre',Heebo,serif", display: 'flex', flexDirection: 'column', padding: '64px 80px 70px', boxSizing: 'border-box', alignItems: 'stretch' }}>
      <Frame W={W} H={H} color={t.ln} />
      <div style={{ position: 'absolute', top: 54, right: 108, fontSize: 28, color: t.ac, fontWeight: 700 }}>בס״ד</div>
      <div style={{ position: 'relative', alignSelf: 'center', width: 940, height: 400, marginTop: 6 }}>
        <Temple />
        <div style={{ position: 'absolute', left: 290, top: 156, width: 360, height: 196, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.05 }}>
          <div style={{ ...gold, fontSize: 44 }}>בית הכנסת</div>
          <div style={{ ...gold, fontSize: Math.min(nfs, 360 / Math.max(nm.length * 0.5, 3)) }}>{nm}</div>
          <div style={{ ...gold, fontSize: 30, marginTop: 6 }}>זמני תפילות ושיעורי תורה</div>
        </div>
      </div>
      {shab && d.parsha ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, marginTop: -6, position: 'relative' }}>
          <div style={{ position: 'absolute', right: 0, top: 40 }}><Laurel /></div><div style={{ position: 'absolute', left: 0, top: 40 }}><Laurel flip /></div>
          <TorahCase>
            <div style={{ fontSize: 42, fontWeight: 800 }}>{d.chag ? '' : 'שבת פרשת'}</div>
            <div style={{ fontSize: Math.max(52, Math.min(124, 330 / Math.max((d.chag ? d.parsha : pn).length * 0.5, 3))), fontWeight: 900, lineHeight: 1.05 }}>{d.chag ? d.parsha : pn}</div>
            {d.haftara && <div style={{ fontSize: 22, fontFamily: 'Heebo,Arial,sans-serif', marginTop: 4, whiteSpace: 'nowrap' }}>ההפטרה: {d.haftara}</div>}
          </TorahCase>
        </div>) : <div style={{ textAlign: 'center', fontSize: 84, fontWeight: 900, lineHeight: 1.05, margin: '40px 0' }}>{d.kind === 'weekday' ? 'זמני היום' : d.parsha}</div>}
      <div style={{ textAlign: 'center', fontFamily: 'Heebo,Arial,sans-serif', fontSize: 32, fontWeight: 700, color: t.ac, height: 46, margin: '4px 0 8px' }}>{d.special ? d.special + ' · ' : ''}{d.date}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {rows.map(([n, v], i) => (
          <div key={i} style={{ display: 'flex', gap: 10, direction: 'rtl' }}>
            <div style={{ ...box, width: rh }}><Inner /><Ico k={iconOf(n)} /></div>
            <div style={{ ...box, flex: 1, fontSize: n.length > 22 ? fs - 8 : fs, fontWeight: 800, fontFamily: 'Heebo,Arial,sans-serif' }}><Inner />{n}</div>
            <div style={{ ...box, width: 190, fontSize: fs + 4, fontWeight: 900, direction: 'ltr', fontFamily: 'Heebo,Arial,sans-serif' }}><Inner />{v}</div>
          </div>))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ position: 'relative', background: 'linear-gradient(180deg,#0d2257,#06123a)', border: '5px solid #d9b657', borderRadius: 22, boxShadow: '0 4px 12px #0009', padding: '14px 10px', textAlign: 'center' }}><i style={{ position: 'absolute', inset: 6, border: '3px solid #7a5410', borderRadius: 16 }} /><i style={{ position: 'absolute', inset: 14, border: '2px solid #d9b657', borderRadius: 10 }} />
        <span style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', fontSize: 44, color: '#f6d77a' }}>✦</span><span style={{ position: 'absolute', left: 40, top: '50%', transform: 'translateY(-50%)', fontSize: 44, color: '#f6d77a' }}>✦</span>
        <div style={{ ...gold, fontSize: 92, lineHeight: 1.05 }}>{g}</div>
      </div>
    </div>);
}

/** WhatsApp image maker (lives only in the design tab): Shabbat/holiday or weekday poster, content toggles, share/download. */
export default function WhatsAppImage({ syn, cols, st }) {
  const [kind, setKind] = useState('shabbat'), [tpl, setTpl] = useState('temple'), [greet, setGreet] = useState('auto');
  const [opt, setOpt] = useState({ lessons: true, rt: false, netz: true, ann: true });
  const [d, setD] = useState(null), [png, setPng] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  const ref = useRef(null), tg = (k) => (v) => setOpt({ ...opt, [k]: v });
  async function generate() {
    setBusy(true); setMsg(''); setPng('');
    try {
      setD(await build({ syn, cols, st }, kind, opt));
      await new Promise((r) => setTimeout(r, 200));
      if (document.fonts?.ready) await document.fonts.ready;
      const html2canvas = (await import('html2canvas')).default;
      setPng((await html2canvas(ref.current, { scale: 1, backgroundColor: null, useCORS: true, logging: false })).toDataURL('image/png'));
    } catch (e) { setMsg('שגיאה ביצירת התמונה: ' + (e.message || e)); }
    setBusy(false);
  }
  const download = () => { const a = document.createElement('a'); a.href = png; a.download = kind === 'shabbat' ? 'זמני-שבת.png' : 'זמני-חול.png'; document.body.appendChild(a); a.click(); a.remove(); };
  async function share() {
    const text = `${d.name}${d.parsha ? ' · ' + d.parsha : ''}`;
    const file = new File([await (await fetch(png)).blob()], 'times.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text, title: d.name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    download(); window.open(st.waLink || `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setMsg('התמונה ירדה למכשיר. צרפו אותה בקבוצת הווטסאפ שנפתחה.');
  }
  return (
    <Card title="📲 מחולל תמונות לווטסאפ">
      <label>סוג התמונה</label>
      <div className="row">{[['shabbat', 'שבת ומועדים'], ['weekday', 'ימי חול']].map(([k, l]) => <button key={k} type="button" className={`opt ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{l}</button>)}</div>
      <div className="row"><div><label>סגנון</label><div className="grid2">{TPL.map(([k, l]) => <button key={k} type="button" className={`opt ${tpl === k ? 'on' : ''}`} onClick={() => setTpl(k)}>{l}</button>)}</div></div>
        {kind === 'shabbat' && <div><label>ברכה</label><select value={greet} onChange={(e) => setGreet(e.target.value)}><option value="auto">אוטומטי</option><option value="shabbat">שבת שלום ומבורך</option><option value="chag">חג שמח</option></select></div>}</div>
      <Switch label="הצג שיעורי תורה" on={opt.lessons} onChange={tg('lessons')} />
      <Switch label="הצג זמן רבינו תם" on={opt.rt} onChange={tg('rt')} />
      <Switch label="הצג נץ החמה הנראה" on={opt.netz} onChange={tg('netz')} />
      <Switch label="הצג הודעות גבאי" on={opt.ann} onChange={tg('ann')} />
      <button className="b" disabled={busy} onClick={generate} style={{ marginTop: 8 }}>{busy ? 'יוצר…' : 'צור תמונה'}</button>
      {d && <div style={{ position: 'fixed', left: -12000, top: 0 }}><Poster d={d} tpl={tpl} greet={greet} pref={ref} /></div>}
      {png && <>
        <img src={png} alt="תמונת זמנים" style={{ width: '100%', maxWidth: 420, display: 'block', margin: '12px auto', borderRadius: 10, border: '1px solid var(--ln)' }} />
        <div className="row"><button className="b" onClick={share}>שתף בווטסאפ</button><button className="b g" onClick={download}>הורד תמונה (PNG)</button></div>
        {!st.waLink && <div style={{ fontSize: 12, color: 'var(--mu)' }}>קישור לקבוצה מגדירים בהגדרות מערכת.</div>}
      </>}
      {msg && <div style={{ fontSize: 13, color: 'var(--mu)' }}>{msg}</div>}
    </Card>);
}
