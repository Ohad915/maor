'use client';
import { useRef, useState } from 'react';
import { fmt, getZmanim, prayerTime, zOpts } from '@/lib/zmanim';
import { pdayOf, sortPrayers } from '@/lib/zmanim';
import { lessonDays, lessonLabel, lessonWho, gem, hebOf, monthName, parshaInfo, rdOf } from '@/lib/hebrew';
import { haftaraHe } from '@/lib/haftara';
import { Card, Switch } from './UI';

const GOLD = 'linear-gradient(135deg,#f6d77a,#a8761a 50%,#f6d77a)';
const THEME = {
  temple: { bg: 'radial-gradient(120% 70% at 50% 0,#22398a,#0c1538 55%,#050a20)', fg: '#f7ecc8', ac: '#f2c85b', card: 'rgba(255,255,255,.07)', ln: '#d9b657' },
  classic: { bg: 'radial-gradient(120% 70% at 50% 0,#1d2f6b,#0b1230 55%,#05081a)', fg: '#f7ecc8', ac: '#f2c85b', card: 'rgba(255,255,255,.07)', ln: '#d9b657' },
  kotel: { bg: 'repeating-linear-gradient(0deg,transparent 0 118px,#8a6a42 118px 121px),repeating-linear-gradient(90deg,transparent 0 210px,#8a6a42 210px 213px),linear-gradient(135deg,#ead9b8,#c9ad80 50%,#e3cfa8)', fg: '#3b2a14', ac: '#7a4a0c', card: 'rgba(255,248,230,.85)', ln: '#8a6a42' },
};

/* ---------- illustrations (inline SVG: light, crisp, no image files) ---------- */
const GD = <defs>
  <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".25" stopColor="#e8bd4a" /><stop offset=".55" stopColor="#b9801c" /><stop offset=".8" stopColor="#e9c25a" /><stop offset="1" stopColor="#8a5a10" /></linearGradient>
  <linearGradient id="gh" x1="0" x2="1"><stop offset="0" stopColor="#8a5a10" /><stop offset=".3" stopColor="#f7dd8a" /><stop offset=".6" stopColor="#c9941f" /><stop offset="1" stopColor="#7a4e0c" /></linearGradient>
  <linearGradient id="gm" x1="0" x2="1"><stop offset="0" stopColor="#a9a9bd" /><stop offset=".18" stopColor="#f6f6fb" /><stop offset=".5" stopColor="#dcdce8" /><stop offset=".82" stopColor="#fbfbff" /><stop offset="1" stopColor="#9a9ab2" /></linearGradient>
  <linearGradient id="gv" x1="0" x2="1"><stop offset="0" stopColor="#0a1a52" /><stop offset=".5" stopColor="#2a52c4" /><stop offset="1" stopColor="#0a1a52" /></linearGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity=".55" /></filter></defs>;

/** Flower rosette (corner medallion): layered gold petals around a jewel. */
function Rosette({ r = 46 }) {
  return <g filter="url(#sh)">
    {Array.from({ length: 12 }, (_, i) => <ellipse key={i} cx="0" cy={-r * 0.66} rx={r * 0.2} ry={r * 0.36} fill="url(#gg)" stroke="#6b430a" strokeWidth="1.6" transform={`rotate(${i * 30})`} />)}
    <circle r={r * 0.62} fill="url(#gh)" stroke="#6b430a" strokeWidth="3" /><circle r={r * 0.46} fill="#0d2a78" stroke="#f7dd8a" strokeWidth="3" />
    {Array.from({ length: 8 }, (_, i) => <circle key={i} cx="0" cy={-r * 0.54} r="3.2" fill="#fff6cf" transform={`rotate(${i * 45})`} />)}
    <circle r={r * 0.2} fill="url(#gg)" stroke="#6b430a" strokeWidth="2" /></g>;
}
/** Arabesque curls in the top corners (soft, light-blue / gold on the deep blue). */
function Arabesque() {
  const one = <g><g fill="none" strokeLinecap="round">
      <path d="M250 10C180 20 120 60 110 130c-6 50 40 70 60 40 14-24-10-44-26-30" stroke="#6f95ea" strokeWidth="5" />
      <path d="M250 60C200 70 160 100 150 150c-4 30 24 44 38 26" stroke="#d9b657" strokeWidth="3.5" />
      <path d="M250 110C225 120 205 135 198 160" stroke="#6f95ea" strokeWidth="4" />
      <path d="M250 190C215 195 190 215 186 245c-2 20 20 28 28 14" stroke="#d9b657" strokeWidth="3" />
      <path d="M40 10c30 20 36 56 12 80" stroke="#6f95ea" strokeWidth="3.5" />
    </g>
    <g fill="#6f95ea">{[[110, 130], [186, 160], [214, 262], [52, 90]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="6" />)}</g>
    <path d="M232 20c-24-22-60-14-72 8 30 0 52 4 72-8zM250 70c-26-10-56 2-62 24 28-6 44-12 62-24z" fill="#8ab0ff" opacity=".7" /></g>;
  return <svg width="1080" height="340" viewBox="0 0 1080 340" style={{ position: 'absolute', top: 40, left: 0, opacity: .55, pointerEvents: 'none' }}>
    <g transform="translate(780 0)">{one}</g><g transform="translate(300 0) scale(-1 1)">{one}</g>
  </svg>;
}
/** Ornate golden double frame: wide embossed band, inner thin line, beaded rail, corner rosettes and mid-edge fleurons. */
function Frame({ W, H, color }) {
  const mid = [[W / 2, 22], [W / 2, H - 22], [22, H / 2], [W - 22, H / 2]];
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{GD}
      <rect x="9" y="9" width={W - 18} height={H - 18} rx="20" fill="none" stroke="url(#gg)" strokeWidth="18" />
      <rect x="9" y="9" width={W - 18} height={H - 18} rx="20" fill="none" stroke="#fff3c4" strokeOpacity=".55" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
      <rect x="21" y="21" width={W - 42} height={H - 42} rx="14" fill="none" stroke="#6b430a" strokeWidth="3" />
      <rect x="28" y="28" width={W - 56} height={H - 56} rx="12" fill="none" stroke="url(#gh)" strokeWidth="6" />
      <rect x="40" y="40" width={W - 80} height={H - 80} rx="8" fill="none" stroke="url(#gg)" strokeWidth="5" strokeDasharray="1 13" strokeLinecap="round" />
      <rect x="48" y="48" width={W - 96} height={H - 96} rx="6" fill="none" stroke={color} strokeWidth="2" strokeOpacity=".8" />
      {[[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]].map(([x, y]) => <g key={x + '-' + y} transform={`translate(${x} ${y})`}><Rosette r={46} /></g>)}
      {mid.map(([x, y]) => <g key={x + '-' + y} transform={`translate(${x} ${y})`} filter="url(#sh)"><path d="M0-20l18 20-18 20-18-20z" fill="url(#gg)" stroke="#6b430a" strokeWidth="2" /><circle r="6" fill="#0d2a78" stroke="#fff3c4" strokeWidth="2" /></g>)}
    </svg>);
}
/** Corinthian capital: gold abacus, two volutes and acanthus leaves. */
const Cap = ({ x, y }) => <g transform={`translate(${x} ${y})`} filter="url(#sh)">
  <rect x="-42" y="0" width="84" height="14" rx="3" fill="url(#gg)" stroke="#6b430a" strokeWidth="2" />
  <path d="M-34 14c-16 0-22 20-6 26 10 3 14-10 4-12M34 14c16 0 22 20 6 26-10 3-14-10-4-12" fill="none" stroke="url(#gg)" strokeWidth="7" strokeLinecap="round" />
  <path d="M-28 16h56l-6 48h-44z" fill="url(#gg)" stroke="#6b430a" strokeWidth="2" />
  {[-16, 0, 16].map((dx) => <path key={dx} d={`M${dx - 10} 62c-6-24 0-34 ${10 + 0} -44 10 10 16 20 10 44`} fill="#f2cf70" stroke="#6b430a" strokeWidth="1.6" />)}
  <path d="M-14 24c6 8 22 8 28 0" fill="none" stroke="#6b430a" strokeWidth="2" /></g>;
/** Temple facade: pediment with an arch, marble columns (flutes + gold veins), Corinthian capitals, steps; sign opening in the middle. */
function Temple({ W = 940, H = 400 }) {
  const col = (x) => <g key={x}>
    <g filter="url(#sh)"><rect x={x - 25} y="206" width="50" height={H - 252} fill="url(#gm)" stroke="#8d8da6" strokeWidth="1.5" />
      {[-15, -5, 5, 15].map((d) => <line key={d} x1={x + d} x2={x + d} y1="208" y2={H - 48} stroke="#8d8da6" strokeOpacity=".45" strokeWidth="1.5" />)}
      <path d={`M${x - 14} 240q12 24 4 50t14 60M${x + 8} 226q-8 30 6 60`} fill="none" stroke="#d3ad5a" strokeOpacity=".75" strokeWidth="2" />
      <rect x={x - 25} y="206" width="50" height={H - 252} fill="#000" opacity=".08" /></g>
    <Cap x={x} y="146" />
    <g filter="url(#sh)"><rect x={x - 36} y={H - 48} width="72" height="18" rx="4" fill="url(#gg)" stroke="#6b430a" strokeWidth="2" /><rect x={x - 30} y={H - 56} width="60" height="10" rx="3" fill="url(#gg)" stroke="#6b430a" strokeWidth="1.5" /></g></g>;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{GD}
      <rect x="290" y="150" width={W - 580} height={H - 190} fill="#0a1a52" />
      <g filter="url(#sh)">
        <path d={`M14 156 L${W / 2} 4 L${W - 14} 156 Z`} fill="url(#gg)" stroke="#6b430a" strokeWidth="3" />
        <path d={`M52 150 L${W / 2} 28 L${W - 52} 150 Z`} fill="url(#gm)" stroke="#8d8da6" strokeWidth="2" />
        <path d={`M92 148 L${W / 2} 50 L${W - 92} 148 Z`} fill="none" stroke="url(#gg)" strokeWidth="6" strokeLinejoin="round" />
        {Array.from({ length: 30 }, (_, i) => { const t = (i + 0.5) / 30; const x = 30 + t * (W / 2 - 30); return <g key={i}><rect x={x - 3} y={150 - (x - 14) * 0.325 + 4} width="6" height="9" fill="#6b430a" opacity=".7" transform={`rotate(-18 ${x} ${150 - (x - 14) * 0.325})`} /><rect x={W - x - 3} y={150 - (x - 14) * 0.325 + 4} width="6" height="9" fill="#6b430a" opacity=".7" transform={`rotate(18 ${W - x} ${150 - (x - 14) * 0.325})`} /></g>; })}
        <path d={`M${290} 150 Q${W / 2} 28 ${W - 290} 150 Z`} fill="url(#gv)" stroke="url(#gg)" strokeWidth="8" />
        <path d={`M${W / 2 - 46} 44 q46-34 92 0 q-46 28-92 0z`} fill="url(#gg)" stroke="#6b430a" strokeWidth="2" />
        <circle cx={W / 2} cy="44" r="9" fill="#d33a4a" stroke="#fff3c4" strokeWidth="2" />
        <rect x="6" y="150" width={W - 12} height="18" rx="4" fill="url(#gg)" stroke="#6b430a" strokeWidth="2" /></g>
      {[120, 225].map(col)}{[W - 225, W - 120].map(col)}
      <g filter="url(#sh)"><rect x="50" y={H - 30} width={W - 100} height="12" fill="url(#gm)" stroke="#8d8da6" /><rect x="14" y={H - 18} width={W - 28} height="18" fill="url(#gm)" stroke="#8d8da6" /></g>
    </svg>);
}
/** Golden olive branch: thick gradient stem and leaf pairs with a centre vein and highlight. */
const Leaf = ({ x, y, r, s = 1 }) => <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}><path d="M0 0C14-22 46-22 66 0 46 22 14 22 0 0z" fill="url(#gh)" stroke="#6b430a" strokeWidth="2" /><path d="M4 0H60" stroke="#6b430a" strokeWidth="1.6" /><path d="M10-6C26-14 44-12 56-4" fill="none" stroke="#fff1b8" strokeOpacity=".7" strokeWidth="2" /></g>;
function Laurel({ flip }) {
  return <svg width="215" height="344" viewBox="-40 0 250 400" style={{ transform: flip ? 'scaleX(-1)' : 'none' }} filter="url(#sh)">{GD}
    <path d="M150 392 Q-4 250 96 12" fill="none" stroke="url(#gh)" strokeWidth="11" strokeLinecap="round" /><path d="M150 392 Q-4 250 96 12" fill="none" stroke="#fff1b8" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
    {Array.from({ length: 11 }, (_, i) => { const t = i / 10, y = 360 - i * 32, x = 142 - Math.sin(t * 2.6) * 108 + t * 6; return <g key={i}><Leaf x={x} y={y} r={-150 - t * 20} s={1.15 - t * 0.35} /><Leaf x={x} y={y - 10} r={-18 + t * 14} s={1.1 - t * 0.35} /></g>; })}
    <Leaf x="96" y="20" r="-96" s=".8" /></svg>;
}
/** Ornate silver-and-gold scroll roller: engraved cylinder with gold filigree, banded ends and finials. */
function Roller({ x, H }) {
  const top = 96, hh = H - 150;
  return <g filter="url(#sh)">
    <defs><pattern id="fil" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M23 4c10 0 16 8 10 15-5 6-14 2-12-5 1-4 6-5 8-2M23 42c-10 0-16-8-10-15 5-6 14-2 12 5-1 4-6 5-8 2" fill="none" stroke="#b9801c" strokeWidth="3" strokeLinecap="round" /><circle cx="23" cy="23" r="3.5" fill="#d9a53a" /></pattern>
      <linearGradient id="gcy" x1="0" x2="1"><stop offset="0" stopColor="#5d5f6c" stopOpacity=".7" /><stop offset=".25" stopColor="#fff" stopOpacity=".15" /><stop offset=".6" stopColor="#000" stopOpacity=".05" /><stop offset="1" stopColor="#000" stopOpacity=".55" /></linearGradient></defs>
    <rect x={x - 40} y={top} width="80" height={hh} rx="14" fill="url(#gs)" stroke="#6b430a" strokeWidth="4" />
    <rect x={x - 40} y={top} width="80" height={hh} rx="14" fill="url(#fil)" opacity=".95" /><rect x={x - 40} y={top} width="80" height={hh} rx="14" fill="url(#gcy)" />
    {[top + 4, top + hh - 18].map((y) => <rect key={y} x={x - 46} y={y} width="92" height="16" rx="6" fill="url(#gg)" stroke="#6b430a" strokeWidth="2.5" />)}
    {[top + 34, top + hh - 48].map((y) => <rect key={y} x={x - 43} y={y} width="86" height="8" rx="3" fill="url(#gg)" stroke="#6b430a" strokeWidth="1.5" />)}
    <path d={`M${x - 26} ${top - 4} q26-34 52 0z`} fill="url(#gg)" stroke="#6b430a" strokeWidth="3" /><circle cx={x} cy={top - 24} r="13" fill="url(#gg)" stroke="#6b430a" strokeWidth="3" />
    <path d={`M${x - 26} ${top + hh + 2} q26 34 52 0z`} fill="url(#gg)" stroke="#6b430a" strokeWidth="3" /><circle cx={x} cy={top + hh + 26} r="13" fill="url(#gg)" stroke="#6b430a" strokeWidth="3" /></g>;
}
/** Large royal crown: velvet cap with gold ribs, jewelled band, pearls, orb and cross. */
function Crown({ w = 300 }) {
  const jw = [[-80, '#d33a4a'], [-40, '#2b6fe0'], [0, '#d33a4a'], [40, '#2b6fe0'], [80, '#d33a4a']];
  return <svg width={w} height={w * 0.66} viewBox="-150 0 300 198" filter="url(#sh)">{GD}
    <path d="M-102 128C-106 62-58 30 0 30S106 62 102 128z" fill="url(#gv)" stroke="#6b430a" strokeWidth="3" />
    {[-60, -30, 30, 60].map((d) => <path key={d} d={`M${d * 1.5} 128C${d * 1.2} 90 ${d * 0.5} 54 0 32`} fill="none" stroke="#e8bd4a" strokeWidth="3" strokeOpacity=".8" />)}
    <path d="M-104 128C-92 52-30 24 0 24S92 52 104 128" fill="none" stroke="url(#gg)" strokeWidth="11" strokeLinecap="round" />
    <path d="M-104 128C-70 70-20 40 0 30S70 70 104 128" fill="none" stroke="url(#gh)" strokeWidth="7" strokeLinecap="round" />
    <circle cx="0" cy="20" r="14" fill="url(#gg)" stroke="#6b430a" strokeWidth="3" /><circle cx="0" cy="6" r="9" fill="url(#gg)" stroke="#6b430a" strokeWidth="2.5" />
    <rect x="-118" y="124" width="236" height="42" rx="12" fill="url(#gg)" stroke="#6b430a" strokeWidth="3.5" />
    {jw.map(([x, c]) => <g key={x}><circle cx={x} cy="145" r="14" fill="url(#gh)" stroke="#6b430a" strokeWidth="2" /><circle cx={x} cy="145" r="9.5" fill={c} stroke="#fff3c4" strokeWidth="2" /><circle cx={x - 3} cy="142" r="2.6" fill="#fff" opacity=".8" /></g>)}
    {[-60, -20, 20, 60, -100, 100].map((x) => <circle key={x} cx={x} cy="145" r="5" fill="#fff" stroke="#c9b27a" />)}
    {Array.from({ length: 13 }, (_, i) => <circle key={i} cx={-108 + i * 18} cy="176" r="6" fill="#fff" stroke="#c9b27a" strokeWidth="1.5" />)}
    <path d="M-118 134c-14-6-22 4-14 14M118 134c14-6 22 4 14 14" fill="none" stroke="url(#gg)" strokeWidth="6" strokeLinecap="round" /></svg>;
}
/** Torah scroll: two ornate rollers around an aged parchment; the crown sits big above it. Children are placed on the parchment. */
function TorahCase({ children, W = 740, H = 400 }) {
  const px = 170, pw = W - 2 * px;
  return (
    <div style={{ position: 'relative', width: W, height: H, margin: '0 auto' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>{GD}
        <defs><linearGradient id="gs" x1="0" x2="1"><stop offset="0" stopColor="#7d7f8c" /><stop offset=".3" stopColor="#f6f6fa" /><stop offset=".65" stopColor="#c3c5d0" /><stop offset="1" stopColor="#6f717e" /></linearGradient>
          <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e9d6a8" /><stop offset=".12" stopColor="#fbf2d8" /><stop offset=".88" stopColor="#fbf2d8" /><stop offset="1" stopColor="#dcc691" /></linearGradient></defs>
        <g filter="url(#sh)"><rect x={px} y="104" width={pw} height={H - 150} fill="url(#gp)" stroke="#a8761a" strokeWidth="2" /></g>
        <Roller x={px - 4} H={H} /><Roller x={W - px + 4} H={H} />
      </svg>
      <div style={{ position: 'absolute', left: px + 20, top: 132, width: pw - 40, height: H - 206, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#1b1204' }}>{children}</div>
    </div>);
}
/** Gold fleuron for the banner sides. */
const Fleur = () => <svg width="70" height="70" viewBox="-35 -35 70 70">{GD}<g filter="url(#sh)" fill="url(#gg)" stroke="#6b430a" strokeWidth="1.5"><path d="M0-28c8 8 8 16 0 22-8-6-8-14 0-22z" /><path d="M0 28c8-8 8-16 0-22-8 6-8 14 0 22z" /><path d="M-28 0c8-8 16-8 22 0-6 8-14 8-22 0z" /><path d="M28 0c-8-8-16-8-22 0 6 8 14 8 22 0z" /><circle r="6" fill="#0d2a78" stroke="#fff3c4" strokeWidth="2" /></g></svg>;
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
const tmin = (v) => { const m = /(\d{1,2}):(\d{2})/.exec(String(v || '')); return m ? +m[1] * 60 + +m[2] : null; };
const hm = (v) => String(v || '').replace(/(^|\D)(\d):(\d{2})/g, '$10$2:$3');
const SEGN = ['ערב שבת', 'שבת', 'מוצ״ש'];
/** Friday split: morning (stays in the weekday picture) vs. afternoon/evening (belongs to the Shabbat picture). By prayer name first, then by the time versus Friday's halachic noon. */
function fridayPart(name, time, zf, candle = 20) {
  if (/שחרית|ותיקין|הנץ|נץ/.test(name)) return 'am';
  if (/מנחה|קבלת|ערבית|מעריב|לכה דודי|נרות/.test(name)) return 'pm';
  // anything else (lessons, custom rows): afternoon = from 1h after halachic noon, but not earlier than 4h before candle lighting
  const t = tmin(time), c = zf.chatzot ? tmin(fmt(zf.chatzot)) + 60 : 780, cl = zf.shkia ? tmin(fmt(zf.shkia.minus({ minutes: candle }))) - 240 : 0;
  return t == null || t >= Math.max(c, cl) ? 'pm' : 'am';
}
export async function build({ syn, cols, st }, kind, opt) {
  const loc = syn.location || { lat: 31.77, lng: 35.21, elevation: 0 }, zo = { ...zOpts(st), rt: opt.rt, visible: opt.netz };
  const now = new Date(), z00 = getZmanim(now, loc, zo), shab = kind === 'shabbat';
  const pr = sortPrayers(cols.prayers || []).filter((r) => (r.show ?? 'bar') !== 'off');
  const hasDow = (r) => Array.isArray(r.dow) && r.dow.length > 0;
  // which prayer rows belong to which part of the week (same rules as the screen: explicit weekday list wins, otherwise the day-type)
  const pick = (idx, kinds) => pr.filter((r) => (hasDow(r) ? idx.some((i) => r.dow.includes(i)) : kinds.includes(pdayOf(r))));
  const les = opt.lessons ? (cols.lessons || []).filter((l) => l.showWa !== false && (l.mode ?? 'block') !== 'off') : [];
  const items = [], add = (n, v, seg, o = {}) => { if (v && v !== '—') items.push({ n, v: hm(v), seg, ...o }); };
  /** prayers with the same name in the same part of the picture become ONE row with all the times (sorted, unique) */
  const addPrayers = (rows, z, seg, suf = '') => {
    const m = new Map(); rows.forEach((r) => { const k = r.name + suf, t = prayerTime(r, z); if (!m.has(k)) m.set(k, { n: r.name, suf, t: [] }); const g = m.get(k); if (t && t !== '—' && !g.t.includes(hm(t))) g.t.push(hm(t)); });
    m.forEach((g) => add(g.n, g.t.sort((a, b) => (tmin(a) ?? 1e4) - (tmin(b) ?? 1e4)).join(' , '), seg, { p: true, suf: g.suf }));
  };
  const sel = (z) => (zo.shma === 'mga' ? ['סוף זמן ק״ש (מג״א)', fmt(z.shmaMga)] : ['סוף זמן ק״ש', fmt(z.shma)]);
  const lWho = (l) => lessonWho(l);
  if (shab) {
    let ahead = (6 - z00.dow + 7) % 7; if (z00.dow === 6 && z00.tzeit && z00.now >= (z00.shabEnd || z00.tzeit)) ahead = 7;
    const sat = new Date(+now + ahead * 864e5), fri = new Date(+sat - 864e5), zs = getZmanim(sat, loc, zo), zf = getZmanim(fri, loc, zo);
    const pi = parshaInfo(sat, 6, false), hs = hebOf(sat, false), candleT = zf.shkia && fmt(zf.shkia.minus({ minutes: st.candle }));
    // --- Friday: only the afternoon/evening goes in the Shabbat picture (candle lighting, mincha, kabbalat Shabbat, arvit)
    add('הדלקת נרות', candleT, 0, { z: true });
    addPrayers(pick([5], ['fri']).filter((r) => fridayPart(r.name, prayerTime(r, zf), zf, st.candle) === 'pm'), zf, 0);
    les.filter((l) => lessonDays(l).includes(5) && !lessonDays(l).some((x) => x <= 4)).forEach((l) => { const t = prayerTime(l, zf); if (fridayPart(l.title, t, zf, st.candle) === 'pm') add(lessonLabel(l), t, 0, { l: true, sub: lWho(l) }); });
    // --- Shabbat day
    if (opt.netz) add('הנץ החמה', fmt(zs.netz), 1, { z: true });
    { const [n, v] = sel(zs); add(n, v, 1, { z: true }); }
    addPrayers(pick([6], ['shab', 'chag', 'all']), zs, 1);
    const endM = tmin(fmt(zs.shabEnd || zs.tzeit));
    les.filter((l) => lessonDays(l).includes(6)).forEach((l) => { const t = prayerTime(l, zs); add(lessonLabel(l), t, tmin(t) != null && endM != null && tmin(t) >= endM ? 2 : 1, { l: true, sub: lWho(l) }); });
    // --- Motzaei Shabbat
    addPrayers(pr.filter((r) => !hasDow(r) && pdayOf(r) === 'mots'), zs, 2);
    add('צאת השבת', fmt(zs.shabEnd || zs.tzeit), 2, { z: true });
    if (opt.rt) add('רבינו תם', fmt(zs.rt), 2, { z: true });
    const haf = st.waHaftara === false ? '' : st.hfText || (await haftaraHe(rdOf(sat), syn.nusach));
    return { name: syn.name, kind, items, parsha: st.waParsha === false ? '' : pi.title, special: pi.sp.join(' · '), chag: !pi.title.startsWith('פרשת'), haftara: haf, date: `${gem(hs.d)} ב${monthName(hs.raw)} ה׳${gem(hs.y % 1000)}` };
  }
  // weekday picture = a regular Sun–Thu day (generated on Fri/Sat -> the coming Sunday); Friday MORNING prayers join it, Friday evening is in the Shabbat picture
  const wk = z00.dow === 5 || z00.dow === 6 ? new Date(+now + (7 - z00.dow) * 864e5) : now, z0 = getZmanim(wk, loc, zo), hn = hebOf(wk, false);
  const zf = getZmanim(new Date(+wk + (5 - z0.dow) * 864e5), loc, zo), week = pick([0, 1, 2, 3, 4], ['week', 'all']), wid = new Set(week.map((r) => r.id));
  if (opt.netz) add('הנץ החמה', fmt(z0.netz), 0, { z: true });
  { const [n, v] = sel(z0); add(n, v, 0, { z: true }); }
  addPrayers(week, z0, 0);
  addPrayers(pick([5], ['fri']).filter((r) => !wid.has(r.id) && fridayPart(r.name, prayerTime(r, zf), zf, st.candle) === 'am'), zf, 0, ' · שישי');
  les.filter((l) => lessonDays(l).some((x) => x <= 4)).forEach((l) => add(lessonLabel(l), prayerTime(l, z0), 0, { l: true, sub: lWho(l) }));
  les.filter((l) => lessonDays(l).includes(5) && !lessonDays(l).some((x) => x <= 4)).forEach((l) => { const t = prayerTime(l, zf); if (fridayPart(l.title, t, zf, st.candle) === 'am') add(lessonLabel(l) + ' · שישי', t, 0, { l: true, sub: lWho(l) }); });
  add('חצות היום', fmt(z0.chatzot), 0, { z: true }); add('שקיעה', fmt(z0.shkia), 0, { z: true }); add('צאת הכוכבים', fmt(z0.tzeit), 0, { z: true });
  if (opt.rt) add('רבינו תם', fmt(z0.rt), 0, { z: true });
  return { name: syn.name, kind, items, parsha: '', date: `${gem(hn.d)} ב${monthName(hn.raw)} ה׳${gem(hn.y % 1000)}` };
}

/** Ordered rows [label, time, sub, seg, item]: ONE chronological merge of zmanim + prayers + lessons + psalms. Shabbat = Friday evening -> Shabbat -> Motzaei Shabbat (each part sorted by time); with `hdr` a divider row opens each part. */
export function orderRows(d, hdr) {
  const sh = d.kind === 'shabbat', segs = {};
  d.items.forEach((i) => { if (i.p) (segs[i.n] ||= new Set()).add(i.seg); });
  const lab = (i) => (sh && i.p && segs[i.n].size > 1 ? `${i.n} · ${SEGN[i.seg]}` : i.n) + (i.suf || '');
  const rows = d.items.map((i, k) => [i, k]).filter(([i]) => i.v).sort(([a, i], [b, j]) => (a.seg - b.seg) || ((tmin(a.v) ?? 1e4) - (tmin(b.v) ?? 1e4)) || i - j).map(([i]) => [lab(i), i.v, i.sub || '', i.seg, i]);
  if (!hdr || !sh) return rows;
  const out = []; let last = -1; rows.forEach((r) => { if (r[3] !== last) { out.push([SEGN[r[3]], '', '', r[3], { hdr: true }]); last = r[3]; } out.push(r); }); return out;
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
  const rh = Math.max(44, Math.min(84, Math.floor((730 - gap * (n - 1)) / n))), fs = Math.round(Math.min(40, rh * 0.47));
  const nm = (d.name || '').replace(/^בית (ה)?כנסת\s+/, '').trim() || d.name, nfs = nm.length <= 8 ? 104 : nm.length <= 12 ? 84 : nm.length <= 18 ? 64 : 50;
  const box = { position: 'relative', background: 'linear-gradient(180deg,#0d2257,#071538)', border: '2px solid #e0bd5f', borderRadius: 12, boxShadow: '0 3px 8px #0007', color: '#f7e7b0', display: 'flex', alignItems: 'center', justifyContent: 'center', height: rh };
  const gold = { color: '#f9df8e', textShadow: '0 0 22px #f6d77acc, 0 3px 0 #8a5a10, 0 6px 0 #5a3d0a, 0 10px 14px #000b', fontWeight: 900 };
  const pn = d.parsha.startsWith('פרשת ') ? d.parsha.slice(5) : d.parsha;
  return (
    <div ref={pref} dir="rtl" style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: t.bg, color: t.fg, fontFamily: "'Frank Ruhl Libre','David Libre',Heebo,serif", display: 'flex', flexDirection: 'column', padding: '64px 80px 70px', boxSizing: 'border-box', alignItems: 'stretch' }}>
      <Arabesque />
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
          <div style={{ position: 'absolute', right: -8, top: 46 }}><Laurel /></div><div style={{ position: 'absolute', left: -8, top: 46 }}><Laurel flip /></div>
          <TorahCase>
            <div style={{ position: 'absolute', top: -188, left: '50%', transform: 'translateX(-50%)', zIndex: 2, pointerEvents: 'none' }}><Crown w={292} /></div>
            <div style={{ fontSize: 42, fontWeight: 800 }}>{d.chag ? '' : 'שבת פרשת'}</div>
            <div style={{ fontSize: Math.max(52, Math.min(124, 330 / Math.max((d.chag ? d.parsha : pn).length * 0.5, 3))), fontWeight: 900, lineHeight: 1.05 }}>{d.chag ? d.parsha : pn}</div>
            {d.haftara && <div style={{ fontSize: 22, fontFamily: 'Heebo,Arial,sans-serif', marginTop: 4, whiteSpace: 'nowrap' }}>ההפטרה: {d.haftara}</div>}
          </TorahCase>
        </div>) : <div style={{ textAlign: 'center', fontSize: 84, fontWeight: 900, lineHeight: 1.05, margin: '40px 0' }}>{d.kind === 'weekday' ? 'זמני היום' : d.parsha}</div>}
      <div style={{ textAlign: 'center', fontFamily: 'Heebo,Arial,sans-serif', fontSize: 32, fontWeight: 700, color: t.ac, height: 46, margin: '4px 0 8px' }}>{d.special ? d.special + ' · ' : ''}{d.date}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {rows.map(([n, v, sub], i) => (
          <div key={i} style={{ display: 'flex', gap: 10, direction: 'rtl' }}>
            <div style={{ ...box, width: rh }}><Ico k={iconOf(n)} /></div>
            <div style={{ ...box, flex: 1, flexDirection: 'column', fontSize: n.length > 22 ? fs - 8 : fs, fontWeight: 800, fontFamily: 'Heebo,Arial,sans-serif', lineHeight: 1.05 }}><span>{n}</span>{sub && <span style={{ fontSize: Math.round(fs * 0.68), fontWeight: 600, opacity: 0.9 }}>{sub}</span>}</div>
            <div style={{ ...box, width: 190, fontSize: fs + 4, fontWeight: 900, direction: 'ltr', fontFamily: 'Heebo,Arial,sans-serif' }}>{v}</div>
          </div>))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ position: 'relative', background: 'linear-gradient(180deg,#0d2257,#06123a)', border: '5px solid #d9b657', borderRadius: 22, boxShadow: '0 4px 12px #0009', padding: '14px 10px', textAlign: 'center' }}><i style={{ position: 'absolute', inset: 6, border: '3px solid #7a5410', borderRadius: 16 }} /><i style={{ position: 'absolute', inset: 14, border: '2px solid #d9b657', borderRadius: 10 }} />
        <span style={{ position: 'absolute', right: 34, top: '50%', transform: 'translateY(-50%)' }}><Fleur /></span><span style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(-50%) scaleX(-1)' }}><Fleur /></span>
        <div style={{ ...gold, fontSize: 92, lineHeight: 1.05 }}>{g}</div>
      </div>
    </div>);
}


/* ---------- Asset-overlay renderer: template_bg.png + dynamic text/icons drawn on ONE canvas (sharp PNG, 1080x1920) ---------- */
const TPL_SRC = '/images/templates/template_bg.png', TW = 941, TH = 1672; // coordinates below are measured on the template (941x1672) and scaled
const ICON_SVG = {
  candle: '<path d="M24 4c5 6 5 10 0 13-5-3-5-7 0-13z" fill="#f2c85b"/><rect x="19" y="20" width="10" height="22" rx="2"/>',
  sun: '<circle cx="24" cy="26" r="9" fill="#f2c85b"/><path d="M24 6v6M8 26h6M34 26h6M12 14l4 4M36 14l-4 4M6 42h36"/>',
  moon: '<path d="M32 8a16 16 0 1 0 8 28A14 14 0 0 1 32 8z" fill="#f2c85b"/>',
  star: '<path d="M24 5l5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1z" fill="#f2c85b"/>',
  shul: '<path d="M6 42V22l18-14 18 14v20zM18 42V28h12v14"/>',
  book: '<path d="M8 10h14a4 4 0 0 1 4 4v26a4 4 0 0 0-4-4H8zM40 10H26"/><path d="M40 10v26H26"/>',
};
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img ' + src)); i.src = src; });
const iconImg = (k) => loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48" fill="none" stroke="#f2c85b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[k] || ICON_SVG.shul}</svg>`));
const SERIF = "'Frank Ruhl Libre','David Libre','David',serif", SANS = "Heebo,Arial,sans-serif";
function fitFont(c, text, maxW, size, weight, fam, min = 14) { let z = size; for (; z > min; z -= 2) { c.font = `${weight} ${z}px ${fam}`; if (c.measureText(text).width <= maxW) break; } c.font = `${weight} ${z}px ${fam}`; return z; }
function goldText(c, text, x, y, size, maxW, fam = SERIF) {
  const z = fitFont(c, text, maxW, size, 900, fam, 20), d = Math.max(2, z / 22);
  c.save(); c.fillStyle = '#5a3d0a'; c.fillText(text, x, y + d * 2.4); c.fillStyle = '#8a5a10'; c.fillText(text, x, y + d * 1.2);
  c.shadowColor = 'rgba(246,215,122,.85)'; c.shadowBlur = z * 0.35; c.fillStyle = '#f9df8e'; c.fillText(text, x, y); c.restore();
}
export async function renderPoster(d, greet) {
  const W = 1080, H = 1920, sx = W / TW, sy = H / TH, X = (v) => v * sx, Y = (v) => v * sy;
  await Promise.all([document.fonts?.load?.('900 60px "Frank Ruhl Libre"'), document.fonts?.load?.('700 30px Heebo')].map((p) => Promise.resolve(p).catch(() => {})));
  const bg = await loadImg(TPL_SRC), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(bg, 0, 0, W, H);
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const shab = d.kind === 'shabbat', cx = X(470);
  // sign in the temple
  const nm = (d.name || '').replace(/^בית (ה)?כנסת\s+/, '').trim() || d.name;
  goldText(c, 'בית הכנסת', cx, Y(232), 54, X(400));
  goldText(c, nm, cx, Y(318), 112, X(440));
  goldText(c, 'זמני תפילות ושיעורי תורה', cx, Y(392), 40, X(440), SANS);
  // parchment: parsha + haftara (no verse numbers)
  c.fillStyle = '#2a1a05';
  const pw = X(236);
  if (shab && d.parsha) {
    const pn = d.chag ? d.parsha : d.parsha.replace(/^פרשת\s+/, '');
    if (!d.chag) { fitFont(c, 'שבת פרשת', pw, 44, 800, SERIF); c.fillText('שבת פרשת', cx, Y(626)); }
    fitFont(c, pn, pw, 104, 900, SERIF, 30); c.fillText(pn, cx, Y(d.chag ? 680 : 690));
    if (d.haftara) { const t = 'ההפטרה: ' + d.haftara; fitFont(c, t, pw, 26, 600, SANS, 14); c.fillText(t, cx, Y(762)); }
  } else {
    fitFont(c, 'זמני היום', pw, 90, 900, SERIF); c.fillText('זמני היום', cx, Y(690));
  }
  // Hebrew date under the scroll
  c.fillStyle = '#f2c85b'; fitFont(c, d.date, X(250), 34, 700, SANS, 16); c.fillText(d.date, cx, Y(835));
  // rows: time (left box) | label (middle) | icon (right box)
  const dyn = shab || orderRows(d).length > 8; // weekday with <= 8 rows keeps the baked slots; everything else is laid out dynamically
  if (!dyn) {
    const rows = orderRows(d), top0 = 872, pitch = 69.9, bh = 62, MAXR = 8;
    for (let i = 0; i < MAXR; i++) {
      const y = top0 + i * pitch, yc = Y(y + bh / 2);
      if (i >= rows.length) { // unused template slot: paint over it with the template's own background strip
        const k = bg.naturalWidth / TW; c.drawImage(bg, 92 * k, (y - 8) * k, 30 * k, (bh + 16) * k, X(130), Y(y - 8), X(686), Y(bh + 16)); continue; }
      const [n, v, sub] = rows[i];
      c.fillStyle = '#f7e7b0';
      if (sub) { fitFont(c, n, X(400), 36, 800, SANS, 16); c.fillText(n, X(488), yc - Y(10)); c.fillStyle = '#e8d49a'; fitFont(c, sub, X(400), 26, 600, SANS, 14); c.fillText(sub, X(488), yc + Y(15)); c.fillStyle = '#f7e7b0'; }
      else { fitFont(c, n, X(400), 40, 800, SANS, 18); c.fillText(n, X(488), yc); }
      c.fillStyle = '#f9df8e'; fitFont(c, v, X(116), 44, 900, SANS, 20); c.direction = 'ltr'; c.fillText(v, X(203), yc); c.direction = 'rtl';
      const im = await iconImg(iconOf(n)), sz = Y(48); c.drawImage(im, X(755) - sz / 2, yc - sz / 2, sz, sz);
    }
  } else {
    // AUTO-FIT: repaint the 8 baked slots and draw as many rows as there are (+ a divider per part of the week), shrinking pitch/fonts so everything fits
    const RT = 1000, RB = 1644, RH = RB - RT, HF = 0.62, MINP = 28;
    let rows = orderRows(d, shab);
    const cost = (r) => (r[4]?.hdr ? HF : 1), total = (a) => a.reduce((t, r) => t + cost(r), 0);
    d.cut = 0;
    while (RH / total(rows) < MINP) { // too many for a readable size: drop lessons first, then prayers - never the zmanim
      const nl = rows.filter((r) => r[4]?.l).length, np = rows.filter((r) => r[4]?.p).length, kk = nl > np ? 'l' : 'p'; // trim whichever group is bigger, so lessons and prayers both stay represented
      let i = -1; for (let j = rows.length - 1; j >= 0 && i < 0; j--) if (rows[j][4]?.[kk]) i = j;
      if (i < 0) break; rows.splice(i, 1); d.cut++;
      rows = rows.filter((r, j) => !r[4]?.hdr || (rows[j + 1] && !rows[j + 1][4]?.hdr));
    }
    const kx = bg.naturalWidth / W, ky = bg.naturalHeight / H;
    c.drawImage(bg, 105 * kx, RT * ky, 30 * kx, RH * ky, 150, RT, 780, RH);
    const unit = Math.min(80, RH / Math.max(total(rows), 1)), gap = Math.max(4, unit * 0.1), BX = { t: [160, 308], l: [318, 805], i: [815, 920] };
    const rr = (x, y, w, h, r) => (c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h));
    const box = (x0, x1, y, h) => {
      const r = Math.min(12, h * 0.24), g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#0d2257'); g.addColorStop(1, '#071538');
      c.beginPath(); rr(x0, y, x1 - x0, h, r); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = '#e0bd5f'; c.stroke();
      c.beginPath(); rr(x0 + 3, y + 3, x1 - x0 - 6, h - 6, Math.max(2, r - 2)); c.lineWidth = 1.2; c.strokeStyle = 'rgba(224,189,95,.35)'; c.stroke();
    };
    let y = RT;
    for (const r of rows) {
      const [n, v, sub] = r;
      if (r[4]?.hdr) { // divider: "ערב שבת" / "שבת" / "מוצ״ש"
        const h = unit * HF, yc = y + h / 2, fz = Math.min(34, h * 0.7); c.fillStyle = '#f9df8e'; c.font = `800 ${fz}px ${SANS}`; const tw = c.measureText(n).width;
        c.fillText(n, 540, yc); c.strokeStyle = '#e0bd5f'; c.lineWidth = 2;
        [[160, 540 - tw / 2 - 18], [540 + tw / 2 + 18, 920]].forEach(([a, b]) => { c.beginPath(); c.moveTo(a, yc); c.lineTo(b, yc); c.stroke(); });
        y += h; continue;
      }
      const bh = unit - gap, yc = y + bh / 2, fs = Math.min(42, bh * 0.62);
      box(...BX.t, y, bh); box(...BX.l, y, bh); box(...BX.i, y, bh);
      c.fillStyle = '#f7e7b0';
      if (sub && bh >= 58) { fitFont(c, n, 470, fs * 0.9, 800, SANS, 14); c.fillText(n, 561, yc - bh * 0.17); c.fillStyle = '#e8d49a'; fitFont(c, sub, 470, fs * 0.62, 600, SANS, 12); c.fillText(sub, 561, yc + bh * 0.24); }
      else { const t = sub ? `${n} · ${sub}` : n; fitFont(c, t, 470, fs, 800, SANS, 14); c.fillText(t, 561, yc); }
      c.fillStyle = '#f9df8e'; fitFont(c, v, 136, Math.min(48, bh * 0.7), 900, SANS, 14); c.direction = 'ltr'; c.fillText(v, 234, yc); c.direction = 'rtl';
      const im = await iconImg(iconOf(n)), sz = Math.min(bh * 0.78, 58); c.drawImage(im, 867 - sz / 2, yc - sz / 2, sz, sz);
      y += unit;
    }
  }
  // banner
  const g = !shab ? 'יום מבורך!' : greet === 'chag' || (greet === 'auto' && d.chag) ? 'חג שמח!' : 'שבת שלום ומבורך!';
  goldText(c, g, cx, Y(1538), 104, X(600));
  return cv.toDataURL('image/png');
}

/** WhatsApp image maker (lives only in the design tab): Shabbat/holiday or weekday poster, content toggles, share/download. */
export default function WhatsAppImage({ syn, cols, st, set }) {
  const [kind, setKind] = useState('shabbat'), [greet, setGreet] = useState('auto');
  const [opt, setOpt] = useState({ lessons: true, rt: false, netz: true, ann: true });
  const [vec, setVec] = useState(false), [d, setD] = useState(null), [png, setPng] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  const ref = useRef(null), tg = (k) => (v) => setOpt({ ...opt, [k]: v });
  async function generate() {
    setBusy(true); setMsg(''); setPng('');
    try {
      const data = await build({ syn, cols, st }, kind, opt);
      setD(data); setVec(false);
      try { setPng(await renderPoster(data, greet)); if (data.cut) setMsg(`לא נכנסו כל השורות בגודל קריא – הושמטו ${data.cut} (מהקבוצה הגדולה יותר). אפשר לכבות שיעורים או רבינו תם.`); setBusy(false); return; }
      catch (e) { setMsg('תבנית הרקע לא נטענה, נוצר עיצוב וקטורי חלופי.'); setVec(true); }
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
    <Card fold title="📲 מחולל תמונות לווטסאפ">
      <Switch label="הצג פרשה בתמונה" on={st.waParsha !== false} onChange={(v) => set('waParsha', v)} />
      <Switch label="הצג הפטרה בתמונה" on={st.waHaftara !== false} onChange={(v) => set('waHaftara', v)} />
      <label>סוג התמונה</label>
      <div className="row">{[['shabbat', 'שבת ומועדים (כולל ערב שבת)'], ['weekday', 'ימי חול (א׳–ה׳)']].map(([k, l]) => <button key={k} type="button" className={`opt ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{l}</button>)}</div>
      <div style={{ fontSize: 12, color: 'var(--mu)', margin: '4px 0' }}>{kind === 'shabbat' ? 'תמונת שבת: הדלקת נרות, מנחה וקבלת שבת של יום שישי, שבת ומוצאי שבת – הכל ממוין לפי שעה, עם כותרת לכל חלק. כל שיעורי התורה והתהילים של השבת נכללים.' : 'תמונת חול: כל השיעורים של ימי החול, וימים א׳–ה׳ בלבד (תפילות בוקר של שישי מצורפות). שישי בערב נמצא בתמונת השבת. אם מפיקים בשישי/שבת – הזמנים של יום ראשון הקרוב.'}</div>
      {kind === 'shabbat' && <div><label>ברכה</label><select value={greet} onChange={(e) => setGreet(e.target.value)}><option value="auto">אוטומטי</option><option value="shabbat">שבת שלום ומבורך</option><option value="chag">חג שמח</option></select></div>}
      <Switch label="הצג שיעורי תורה" on={opt.lessons} onChange={tg('lessons')} />
      <Switch label="הצג זמן רבינו תם" on={opt.rt} onChange={tg('rt')} />
      <Switch label="הצג נץ החמה הנראה" on={opt.netz} onChange={tg('netz')} />
      <Switch label="הצג הודעות גבאי" on={opt.ann} onChange={tg('ann')} />
      <button className="b" disabled={busy} onClick={generate} style={{ marginTop: 8 }}>{busy ? 'יוצר…' : 'צור תמונה'}</button>
      {d && vec && <div style={{ position: 'fixed', left: -12000, top: 0 }}><Poster d={d} tpl="temple" greet={greet} pref={ref} /></div>}
      {png && <>
        <img src={png} alt="תמונת זמנים" style={{ width: '100%', maxWidth: 420, display: 'block', margin: '12px auto', borderRadius: 10, border: '1px solid var(--ln)' }} />
        <div className="row"><button className="b" onClick={share}>שתף בווטסאפ</button><button className="b g" onClick={download}>הורד תמונה (PNG)</button></div>
        {!st.waLink && <div style={{ fontSize: 12, color: 'var(--mu)' }}>קישור לקבוצה מגדירים בהגדרות מערכת.</div>}
      </>}
      {msg && <div style={{ fontSize: 13, color: 'var(--mu)' }}>{msg}</div>}
    </Card>);
}
