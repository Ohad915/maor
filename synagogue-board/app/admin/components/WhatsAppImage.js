'use client';
import { useRef, useState } from 'react';
import { fmt, getZmanim, prayerTime } from '@/lib/zmanim';
import { annOn, gem, hebOf, monthName, parshaInfo, rdOf } from '@/lib/hebrew';
import { haftaraHe } from '@/lib/haftara';
import { Card } from './UI';

const TPL = [['royal', 'זהב ומלכותי'], ['stone', 'נוף ירושלמי / אבני הכותל'], ['candles', 'אווירת שבת · נרות וגביע'], ['clean', 'נקי ומודרני']];
const T = {
  royal: { bg: 'radial-gradient(120% 80% at 50% 0,#1d2f6b,#0b1230 55%,#05081a)', fg: '#f7ecc8', ac: '#f2c85b', card: 'rgba(255,255,255,.06)', ln: '#d9b657' },
  stone: { bg: 'repeating-linear-gradient(0deg,transparent 0 118px,#8a6a42 118px 121px),repeating-linear-gradient(90deg,transparent 0 210px,#8a6a42 210px 213px),linear-gradient(135deg,#ead9b8,#c9ad80 50%,#e3cfa8)', fg: '#3b2a14', ac: '#7a4a0c', card: 'rgba(255,248,230,.82)', ln: '#8a6a42' },
  candles: { bg: 'linear-gradient(180deg,#1a0c05,#3a1a08 60%,#5a2a0c)', fg: '#ffe9c0', ac: '#ffb347', card: 'rgba(255,255,255,.07)', ln: '#ffb347' },
  clean: { bg: '#ffffff', fg: '#111111', ac: '#0b3d91', card: '#f1f4fa', ln: '#111111' },
};
const Candle = () => <svg width="60" height="150" viewBox="0 0 60 150"><ellipse cx="30" cy="30" rx="11" ry="22" fill="#ffb347" /><ellipse cx="30" cy="34" rx="6" ry="13" fill="#fff3b0" /><rect x="20" y="52" width="20" height="90" rx="4" fill="#fff4dd" /></svg>;
const Cup = () => <svg width="90" height="130" viewBox="0 0 90 130"><path d="M15 10h60c0 40-14 62-30 66-16-4-30-26-30-66z" fill="#e9c46a" /><rect x="41" y="76" width="8" height="34" fill="#e9c46a" /><rect x="24" y="110" width="42" height="9" rx="4" fill="#e9c46a" /><path d="M20 20h50c-1 22-10 40-25 44-15-4-24-22-25-44z" fill="#8b1a2b" /></svg>;
let wall = 'M0 120V60'; for (let x = 0; x < 1080; x += 80) wall += 'h40v-26h40v26'; wall += 'V120Z';

async function build(syn, cols, st) {
  const loc = syn.location || { lat: 31.77, lng: 35.21, elevation: 0 };
  const now = new Date(), z0 = getZmanim(now, loc, st.shma);
  let ahead = (6 - z0.dow + 7) % 7; if (z0.dow === 6 && z0.tzeit && z0.now >= z0.tzeit) ahead = 7;
  const sat = new Date(+now + ahead * 864e5), fri = new Date(+sat - 864e5);
  const zs = getZmanim(sat, loc, st.shma), zf = getZmanim(fri, loc, st.shma);
  const pi = parshaInfo(sat, 6, false), hs = hebOf(sat, false), hn = hebOf(now, false);
  const pr = (cols.prayers || []).filter((r) => (r.show ?? 'bar') !== 'off');
  const grp = (days, z) => Object.entries(pr.filter((r) => days.includes(r.days)).reduce((a, r) => { (a[r.name] ||= []).push(prayerTime(r, z)); return a; }, {})).map(([n, t]) => [n, t.sort().join(' , ')]);
  const ann = (cols.announcements || []).filter((a) => (a.mode ?? (a.on === false ? 'off' : 'block')) !== 'off' && annOn(a, hn)).slice(0, 4)
    .map((a) => (a.title + ((a.content || '').split('\n')[0] ? ' · ' + (a.content || '').split('\n')[0].slice(0, 60) : '')));
  return {
    name: st.title || syn.name, parsha: pi.title, special: pi.sp.join(' · '), chag: !pi.title.startsWith('פרשת'),
    haftara: await haftaraHe(rdOf(sat)), date: `${gem(hs.d)} ב${monthName(hs.raw)}`,
    times: [['הדלקת נרות', zf.shkia && fmt(zf.shkia.minus({ minutes: st.candle }))], ['הנץ החמה', fmt(zs.netz)], ['סוף זמן ק״ש', fmt(zs.shma)], ['שקיעה', fmt(zs.shkia)], ['צאת השבת', fmt(zs.tzeit)]],
    groups: [['ערב שבת', grp(['fri'], zf)], ['שבת', grp(['shab', 'all'], zs)], ['מוצאי שבת', grp(['mots'], zs)]].filter(([, r]) => r.length), ann,
  };
}

function Poster({ d, tpl, greet, pref }) {
  const t = T[tpl], g = greet === 'auto' ? (d.chag ? 'חג שמח' : 'שבת שלום ומבורך') : greet === 'chag' ? 'חג שמח' : 'שבת שלום ומבורך';
  const card = { background: t.card, border: `3px solid ${t.ln}66`, borderRadius: 18, padding: '16px 22px' };
  return (
    <div ref={pref} dir="rtl" style={{ width: 1080, height: 1350, position: 'relative', overflow: 'hidden', background: t.bg, color: t.fg, fontFamily: "'Frank Ruhl Libre','David Libre',Heebo,serif", display: 'flex', flexDirection: 'column', padding: '58px 66px', boxSizing: 'border-box', gap: 20 }}>
      <div style={{ position: 'absolute', inset: 22, border: tpl === 'clean' ? `10px solid ${t.ln}` : `6px double ${t.ln}`, borderRadius: tpl === 'clean' ? 0 : 26, pointerEvents: 'none' }} />
      {tpl === 'candles' && <><div style={{ position: 'absolute', top: 60, right: 64 }}><Candle /></div><div style={{ position: 'absolute', top: 60, left: 64 }}><Candle /></div></>}
      <div style={{ textAlign: 'center', fontSize: 58, fontWeight: 900, color: t.ac, marginTop: tpl === 'candles' ? 20 : 0 }}>{d.name}</div>
      <div style={{ textAlign: 'center', lineHeight: 1.05 }}>
        <div style={{ fontSize: d.parsha.length > 14 ? 92 : 112, fontWeight: 900 }}>{d.parsha}</div>
        {d.special && <div style={{ fontSize: 40, color: t.ac, fontWeight: 700 }}>{d.special}</div>}
        {d.haftara && <div style={{ fontSize: 32, fontFamily: 'Heebo,Arial,sans-serif', marginTop: 8 }}>הפטרה: {d.haftara}</div>}
        <div style={{ fontSize: 34, fontFamily: 'Heebo,Arial,sans-serif', color: t.ac, marginTop: 8, fontWeight: 700 }}>{d.date}</div>
      </div>
      <div style={{ ...card, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        {d.times.map(([l, v]) => <div key={l}><div style={{ fontSize: 24, fontFamily: 'Heebo,Arial,sans-serif' }}>{l}</div><div style={{ fontSize: 48, fontWeight: 900, color: t.ac, direction: 'ltr' }}>{v || '—'}</div></div>)}
      </div>
      {d.groups.length > 0 && <div style={{ display: 'flex', gap: 18 }}>
        {d.groups.map(([title, rows]) => (
          <div key={title} style={{ ...card, flex: 1 }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: t.ac, borderBottom: `3px solid ${t.ln}55`, paddingBottom: 6, marginBottom: 6, textAlign: 'center' }}>{title}</div>
            {rows.slice(0, 6).map(([n, v]) => <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, padding: '5px 0', gap: 10 }}><span>{n}</span><b style={{ direction: 'ltr' }}>{v}</b></div>)}
          </div>))}
      </div>}
      {d.ann.length > 0 && <div style={card}>
        <div style={{ fontSize: 32, fontWeight: 900, color: t.ac, marginBottom: 6 }}>שיעורים והודעות</div>
        {d.ann.map((a, i) => <div key={i} style={{ fontSize: 28, fontFamily: 'Heebo,Arial,sans-serif', padding: '4px 0' }}>• {a}</div>)}
      </div>}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        {tpl === 'candles' && <Cup />}
        <div style={{ fontSize: 96, fontWeight: 900, color: t.ac, textAlign: 'center', lineHeight: 1 }}>{g}</div>
        {tpl === 'candles' && <Cup />}
      </div>
      {tpl === 'stone' && <svg style={{ position: 'absolute', left: 0, bottom: 0 }} width="1080" height="120" viewBox="0 0 1080 120"><path d={wall} fill="#8a6a42" opacity=".35" /></svg>}
    </div>);
}

/** "צור תמונת זמנים לווטסאפ": builds a 1080x1350 poster, previews it, then download / share. */
export default function WhatsAppImage({ syn, cols, st }) {
  const [tpl, setTpl] = useState('royal'), [greet, setGreet] = useState('auto'), [d, setD] = useState(null), [png, setPng] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  const ref = useRef(null);
  async function generate() {
    setBusy(true); setMsg(''); setPng('');
    try {
      setD(await build(syn, cols, st));
      await new Promise((r) => setTimeout(r, 150)); // let the poster render
      if (document.fonts?.ready) await document.fonts.ready;
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(ref.current, { scale: 1, backgroundColor: null, useCORS: true, logging: false });
      setPng(canvas.toDataURL('image/png'));
    } catch (e) { setMsg('שגיאה ביצירת התמונה: ' + (e.message || e)); }
    setBusy(false);
  }
  const download = () => { const a = document.createElement('a'); a.href = png; a.download = 'זמני-שבת.png'; document.body.appendChild(a); a.click(); a.remove(); };
  async function share() {
    const text = `${d.name} · ${d.parsha}`;
    const file = new File([await (await fetch(png)).blob()], 'shabbat-times.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text, title: d.name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    download();
    window.open(st.waLink || `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setMsg('התמונה ירדה למכשיר. צרפו אותה בקבוצת הווטסאפ שנפתחה.');
  }
  return (
    <Card title="📲 תמונת זמנים לווטסאפ">
      <div className="row">
        <div><label>סגנון רקע ועיצוב</label><select value={tpl} onChange={(e) => setTpl(e.target.value)}>{TPL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><label>ברכה</label><select value={greet} onChange={(e) => setGreet(e.target.value)}><option value="auto">אוטומטי</option><option value="shabbat">שבת שלום ומבורך</option><option value="chag">חג שמח</option></select></div>
      </div>
      <button className="b" disabled={busy} onClick={generate} style={{ marginTop: 8 }}>{busy ? 'יוצר…' : 'צור תמונת זמנים לווטסאפ'}</button>
      {d && <div style={{ position: 'fixed', left: -12000, top: 0 }}><Poster d={d} tpl={tpl} greet={greet} pref={ref} /></div>}
      {png && <>
        <img src={png} alt="תמונת זמנים" style={{ width: '100%', maxWidth: 420, display: 'block', margin: '12px auto', borderRadius: 10, border: '1px solid var(--ln)' }} />
        <div className="row"><button className="b" onClick={share}>שתף בווטסאפ</button><button className="b g" onClick={download}>הורד תמונה (PNG)</button></div>
        {!st.waLink && <div style={{ fontSize: 12, color: 'var(--mu)' }}>אפשר להגדיר קישור לקבוצה בלשונית הגדרות.</div>}
      </>}
      {msg && <div style={{ fontSize: 13, color: 'var(--mu)' }}>{msg}</div>}
    </Card>);
}
