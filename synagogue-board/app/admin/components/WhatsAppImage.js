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
const Candle = () => <svg width="56" height="140" viewBox="0 0 60 150"><ellipse cx="30" cy="30" rx="11" ry="22" fill="#ffb347" /><ellipse cx="30" cy="34" rx="6" ry="13" fill="#fff3b0" /><rect x="20" y="52" width="20" height="90" rx="4" fill="#fff4dd" /></svg>;
function Temple() { // marble columns + arches under a gold cornice
  const cols = Array.from({ length: 8 }, (_, i) => 56 + i * 138);
  return (
    <svg width="948" height="130" viewBox="0 0 948 130">
      <defs><linearGradient id="gm" x1="0" x2="1"><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#c9c9d6" /><stop offset="1" stopColor="#f4f4fa" /></linearGradient><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6d77a" /><stop offset="1" stopColor="#a8761a" /></linearGradient></defs>
      <rect x="0" y="0" width="948" height="16" fill="url(#gg)" /><rect x="0" y="18" width="948" height="5" fill="#f6d77a" />
      {cols.slice(0, -1).map((x, i) => <path key={i} d={`M${x + 36} 112 A${(cols[i + 1] - x - 36) / 2} 56 0 0 1 ${cols[i + 1]} 112`} fill="none" stroke="#f2c85b" strokeWidth="5" />)}
      {cols.map((x) => <g key={x}><rect x={x - 6} y="26" width="48" height="12" fill="url(#gg)" /><rect x={x} y="38" width="36" height="76" fill="url(#gm)" /><rect x={x + 8} y="38" width="3" height="76" fill="#9a9ab0" opacity=".5" /><rect x={x + 24} y="38" width="3" height="76" fill="#9a9ab0" opacity=".5" /><rect x={x - 6} y="114" width="48" height="12" fill="url(#gg)" /></g>)}
    </svg>);
}
function Olive() { return <svg width="300" height="70" viewBox="0 0 300 70"><path d="M5 40 Q150 5 295 40" fill="none" stroke="#5b6b2a" strokeWidth="4" />{Array.from({ length: 14 }, (_, i) => <ellipse key={i} cx={20 + i * 20} cy={i % 2 ? 28 - Math.sin(i / 14 * 3.14) * 14 : 46 - Math.sin(i / 14 * 3.14) * 14} rx="14" ry="5" fill="#7a8a3a" transform={`rotate(${i % 2 ? -25 : 25} ${20 + i * 20} 35)`} />)}</svg>; }
/** Sephardic Torah case: crown, gold body, ornamental border, rollers. Children are placed on the dark plaque. */
function TorahCase({ children }) {
  const W = 380, K = W / 520;
  return (
    <div style={{ position: 'relative', width: W, height: 520 * K, margin: '0 auto' }}>
      <svg width={W} height={520 * K} viewBox="0 0 520 520" style={{ position: 'absolute', inset: 0 }}>
        <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbe7a1" /><stop offset=".5" stopColor="#c9941f" /><stop offset="1" stopColor="#f6d77a" /></linearGradient></defs>
        <rect x="28" y="130" width="22" height="350" rx="10" fill="url(#tg)" stroke="#7a5410" strokeWidth="3" /><rect x="470" y="130" width="22" height="350" rx="10" fill="url(#tg)" stroke="#7a5410" strokeWidth="3" />
        <ellipse cx="39" cy="126" rx="18" ry="14" fill="url(#tg)" stroke="#7a5410" strokeWidth="3" /><ellipse cx="481" cy="126" rx="18" ry="14" fill="url(#tg)" stroke="#7a5410" strokeWidth="3" />
        <path d="M165 108V50l38 30 57-72 57 72 38-30v58z" fill="url(#tg)" stroke="#7a5410" strokeWidth="4" strokeLinejoin="round" />
        {[[165, 48], [260, 6], [355, 48]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="9" fill="#d33a4a" stroke="#7a5410" strokeWidth="3" />)}
        <rect x="150" y="104" width="220" height="26" rx="8" fill="url(#tg)" stroke="#7a5410" strokeWidth="4" />
        <rect x="70" y="126" width="380" height="360" rx="34" fill="url(#tg)" stroke="#7a5410" strokeWidth="6" />
        <rect x="90" y="146" width="340" height="320" rx="22" fill="none" stroke="#fff3c4" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
        <rect x="112" y="206" width="296" height="206" rx="18" fill="#0b1230" stroke="#7a5410" strokeWidth="6" /><rect x="120" y="214" width="280" height="190" rx="12" fill="none" stroke="#f2c85b" strokeWidth="2" />
        {[[100, 160], [420, 160], [100, 450], [420, 450]].map(([x, y]) => <path key={x + '-' + y} d={`M${x} ${y - 12}l12 12-12 12-12-12z`} fill="#7a5410" />)}
        <path d="M200 184h120M200 436h120" stroke="#7a5410" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', left: 120 * K, top: 214 * K, width: 280 * K, height: 190 * K, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>{children}</div>
    </div>);
}

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
    return { ...base, kind, parsha: st.waParsha === false ? '' : pi.title, special: pi.sp.join(' · '), chag: !pi.title.startsWith('פרשת'), haftara: haf, date: `${gem(hs.d)} ב${monthName(hs.raw)}`,
      times: [['הדלקת נרות', zf.shkia && fmt(zf.shkia.minus({ minutes: st.candle }))], opt.netz && ['הנץ החמה', fmt(zs.netz)], sel(zs), ['שקיעה', fmt(zs.shkia)], ['צאת השבת', fmt(zs.tzeit)], opt.rt && ['רבינו תם', fmt(zs.rt)]].filter(Boolean),
      groups: [['ערב שבת', grp(['fri'], zf)], ['שבת', grp(['shab', 'all'], zs)], ['מוצאי שבת', grp(['mots'], zs)]].filter(([, r]) => r.length) };
  }
  return { ...base, kind, parsha: '', date: `${gem(hn.d)} ב${monthName(hn.raw)}`,
    times: [opt.netz && ['הנץ החמה', fmt(z0.netz)], sel(z0), ['חצות היום', fmt(z0.chatzot)], ['שקיעה', fmt(z0.shkia)], ['צאת הכוכבים', fmt(z0.tzeit)], opt.rt && ['רבינו תם', fmt(z0.rt)]].filter(Boolean),
    groups: [['תפילות ימי חול', grp(['week', 'all'], z0)]].filter(([, r]) => r.length) };
}

function Poster({ d, tpl, greet, pref }) {
  const t = THEME[tpl], shab = d.kind === 'shabbat';
  const g = !shab ? 'יום מבורך' : greet === 'chag' || (greet === 'auto' && d.chag) ? 'חג שמח' : 'שבת שלום ומבורך';
  const card = { background: t.card, border: `3px solid ${t.ln}66`, borderRadius: 18, padding: '14px 22px' };
  const pn = d.parsha.startsWith('פרשת ') ? d.parsha.slice(5) : d.parsha;
  return (
    <div ref={pref} dir="rtl" style={{ width: 1080, height: 1350, position: 'relative', overflow: 'hidden', background: t.bg, color: t.fg, fontFamily: "'Frank Ruhl Libre','David Libre',Heebo,serif", display: 'flex', flexDirection: 'column', padding: '70px 66px 64px', boxSizing: 'border-box', gap: 16, alignItems: 'stretch' }}>
      {/* full golden frame: never touches the image edge, so nothing is cut on a phone */}
      <div style={{ position: 'absolute', inset: 14, border: '14px solid transparent', borderImage: `${GOLD} 1`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 40, border: `3px solid ${t.ln}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 48, border: `1px solid ${t.ln}88`, pointerEvents: 'none' }} />
      {[[40, 40], [1040, 40], [40, 1310], [1040, 1310]].map(([x, y]) => <div key={x + '-' + y} style={{ position: 'absolute', left: x - 13, top: y - 13, width: 26, height: 26, background: GOLD, transform: 'rotate(45deg)' }} />)}
      {tpl === 'temple' && <div style={{ alignSelf: 'center', marginTop: -4 }}><Temple /></div>}
      {tpl === 'kotel' && <div style={{ alignSelf: 'center' }}><Olive /></div>}
      {tpl === 'classic' && <><div style={{ position: 'absolute', top: 70, right: 80 }}><Candle /></div><div style={{ position: 'absolute', top: 70, left: 80 }}><Candle /></div></>}
      <div style={{ textAlign: 'center', fontSize: 56, fontWeight: 900, color: t.ac, lineHeight: 1 }}>{d.name}</div>
      {shab && d.parsha && (tpl === 'temple'
        ? <TorahCase><div style={{ fontSize: 26, color: '#f2c85b' }}>{d.parsha.startsWith('פרשת ') ? 'פרשת' : ''}</div><div style={{ fontSize: Math.max(30, Math.min(58, 420 / Math.max(pn.length, 4))), fontWeight: 900, color: '#fff3c4', lineHeight: 1.05 }}>{pn}</div></TorahCase>
        : <div style={{ textAlign: 'center', fontSize: pn.length > 12 ? 92 : 112, fontWeight: 900, lineHeight: 1 }}>{d.parsha}</div>)}
      {!shab && <div style={{ textAlign: 'center', fontSize: 78, fontWeight: 900, lineHeight: 1 }}>זמני תפילות ושיעורים</div>}
      <div style={{ textAlign: 'center', fontFamily: 'Heebo,Arial,sans-serif', lineHeight: 1.3 }}>
        {d.special && <div style={{ fontSize: 34, color: t.ac, fontWeight: 700 }}>{d.special}</div>}
        {d.haftara && <div style={{ fontSize: 32 }}>הפטרה: {d.haftara}</div>}
        <div style={{ fontSize: 32, color: t.ac, fontWeight: 700 }}>{d.date}</div>
      </div>
      <div style={{ ...card, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        {d.times.map(([l, v]) => <div key={l}><div style={{ fontSize: 22, fontFamily: 'Heebo,Arial,sans-serif' }}>{l}</div><div style={{ fontSize: 44, fontWeight: 900, color: t.ac, direction: 'ltr' }}>{v || '—'}</div></div>)}
      </div>
      {d.groups.length > 0 && <div style={{ display: 'flex', gap: 16 }}>
        {d.groups.map(([title, rows]) => (
          <div key={title} style={{ ...card, flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: t.ac, borderBottom: `3px solid ${t.ln}55`, paddingBottom: 4, marginBottom: 4, textAlign: 'center' }}>{title}</div>
            {rows.slice(0, 6).map(([n, v]) => <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, padding: '4px 0', gap: 10 }}><span>{n}</span><b style={{ direction: 'ltr' }}>{v}</b></div>)}
          </div>))}
      </div>}
      {d.lessons.length > 0 && <div style={card}>
        <div style={{ fontSize: 30, fontWeight: 900, color: t.ac, marginBottom: 4 }}>📚 שיעורי תורה</div>
        {d.lessons.slice(0, 4).map((l, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontFamily: 'Heebo,Arial,sans-serif', padding: '3px 0', gap: 12 }}><span>{l.t}{l.who ? ` · ${l.who}` : ''}</span><b style={{ direction: 'ltr' }}>{l.time}</b></div>)}
      </div>}
      {d.ann.length > 0 && <div style={card}>
        <div style={{ fontSize: 30, fontWeight: 900, color: t.ac, marginBottom: 4 }}>הודעות</div>
        {d.ann.map((a, i) => <div key={i} style={{ fontSize: 26, fontFamily: 'Heebo,Arial,sans-serif', padding: '3px 0' }}>• {a}</div>)}
      </div>}
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 88, fontWeight: 900, color: t.ac, textAlign: 'center', lineHeight: 1 }}>{g}</div>
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
      <div className="row">{[['shabbat', 'שבת ומועדים'], ['weekday', 'ימי חול']].map(([k, l]) => <button key={k} className={`b ${kind === k ? '' : 'g'}`} onClick={() => setKind(k)}>{l}</button>)}</div>
      <div className="row"><div><label>סגנון</label><select value={tpl} onChange={(e) => setTpl(e.target.value)}>{TPL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
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
