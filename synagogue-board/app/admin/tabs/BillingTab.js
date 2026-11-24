'use client';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addItem, delItem, setPrivate } from '@/lib/db';
import { useCol } from '@/lib/hooks';
import { Card, Lock, Range, ScreenSel, TextIn } from '../components/UI';

const ils = (n) => (+n || 0).toLocaleString('he-IL') + ' ₪';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

/** Billing & QR: org details, donation QR settings, dues, receipts, clearing-house import. */
export default function BillingTab({ ctx }) {
  const { sid, st, set, feat } = ctx, track = ctx.track || ((p) => Promise.resolve(p).then(() => true, () => false));
  const priv = (d) => track(setPrivate(sid, 'org', d));
  const [org, setOrg] = useState({}), [rc, setRc] = useState(null), [m, setM] = useState({ name: '', idn: '', fee: '' }), [csv, setCsv] = useState(''), [info, setInfo] = useState('');
  const members = useCol(sid, 'members'), receipts = useCol(sid, 'receipts'), donations = useCol(sid, 'donations');
  useEffect(() => onSnapshot(doc(db, 'synagogues', sid, 'private', 'org'), (d) => setOrg(d.data() || {}), (e) => console.error('[maor] org details unavailable:', e?.code || '', e?.message || e)), [sid]);
  const year = String(new Date().getFullYear());

  async function receipt(name, idn, amount, kind, method) {
    try {
      const ref = doc(db, 'synagogues', sid, 'private', 'counters');
      const no = await runTransaction(db, async (tx) => { const n = ((await tx.get(ref)).data()?.receipt || 0) + 1; tx.set(ref, { receipt: n }, { merge: true }); return n; });
      const r = { no, name, idn: idn || '', amount: +amount, kind, method, date: today(), t46: !!org.s46 };
      if (!(await track(addItem(sid, 'receipts', r)))) return alert('השמירה נכשלה – בדקו חיבור/הרשאות ונסו שוב');
      setRc(r);
    } catch (e) { console.error('[maor] receipt failed:', e); alert('השמירה נכשלה – בדקו חיבור/הרשאות ונסו שוב'); } // the receipt transaction needs a live connection
  }
  const paid = (mem) => receipts.filter((r) => r.kind === 'dues:' + mem.id && (r.date || '').startsWith(year)).reduce((a, r) => a + (+r.amount || 0), 0);
  const importCsv = async () => {
    const have = new Set(donations.map((d) => d.ref).filter(Boolean)); let n = 0;
    try {
      for (const l of csv.split('\n')) { const q = l.split(',').map((x) => x.trim()); if (q[0] && +q[2] > 0 && !(q[3] && have.has(q[3]))) { if (!(await track(addItem(sid, 'donations', { name: q[0], idn: q[1] || '', amount: +q[2], ref: q[3] || '', date: today() })))) throw new Error('write'); n++; if (q[3]) have.add(q[3]); } }
      setInfo(`יובאו ${n} רשומות`);
    } catch { setInfo(`הייבוא נעצר אחרי ${n} רשומות – בדקו חיבור/הרשאות ונסו שוב`); }
  };
  return (
    <div className="admin-root">
      <div className="kpis">
        <div className="kpi"><small>גבייה החודש</small><b>{ils(receipts.filter((r) => (r.date || '').startsWith(new Date().toISOString().slice(0, 7))).reduce((a, r) => a + (+r.amount || 0), 0) + donations.filter((x) => (x.date || '').startsWith(new Date().toISOString().slice(0, 7))).reduce((a, x) => a + (+x.amount || 0), 0))}</b></div>
        <div className="kpi"><small>חברים פעילים</small><b>{members.length}</b></div>
        <div className="kpi"><small>חובות פתוחים</small><b style={{ color: 'var(--bad)' }}>{ils(members.reduce((a, mm) => a + Math.max(0, (+mm.fee || 0) - paid(mm)), 0))}</b></div>
      </div>
      <Card fold title="פינת התרומה (QR) במסך">
        <label>כותרת התרומה</label><TextIn value={st.donTitle} placeholder="תרומה מהירה לבית הכנסת" onSave={(v) => set('donTitle', v)} />
        <label>טקסט מתחת ל-QR</label><TextIn value={st.donSub} placeholder="סרקו בנייד לתרומה מאובטחת" onSave={(v) => set('donSub', v)} />
        <label>קישור תשלום (URL)</label><TextIn value={st.payUrl} style={{ direction: 'ltr' }} onSave={(v) => set('payUrl', v)} />
        <Range label="גודל קוביית ה-QR %" min={50} max={150} value={st.qs} onChange={(v) => set('qs', v)} />
        <label>מסך להצגה</label><ScreenSel value={st.donScreen} onChange={(v) => set('donScreen', v)} />
      </Card>
      <Card fold title="פרטי עמותה לקבלות">
        <label>שם העמותה</label><TextIn value={org.name} onSave={(v) => priv({ name: v })} />
        <div className="row"><div><label>מס׳ עמותה</label><TextIn value={org.ngo} onSave={(v) => priv({ ngo: v })} /></div><div><label>מס׳ אישור סעיף 46</label><TextIn value={org.s46} onSave={(v) => priv({ s46: v })} /></div></div>
        <label>ספק סליקה</label>
        <select value={org.provider || 'nedarim'} onChange={(e) => priv({ provider: e.target.value })}><option value="nedarim">נדרים פלוס</option><option value="mesulam">משולם</option><option value="grow">Grow</option></select>
      </Card>

      <Card fold title="הוספת חבר">
        <div className="row"><input placeholder="שם" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /><input placeholder="ת״ז (לקבלה)" value={m.idn} onChange={(e) => setM({ ...m, idn: e.target.value })} /><input type="number" placeholder="דמי חבר שנתיים ₪" value={m.fee} onChange={(e) => setM({ ...m, fee: e.target.value })} /></div>
        <button className="b" onClick={async () => { if (!m.name.trim()) return alert('יש להזין שם'); if (await track(addItem(sid, 'members', { ...m, name: m.name.trim(), fee: +m.fee || 0 }))) setM({ name: '', idn: '', fee: '' }); else alert('השמירה נכשלה – בדקו חיבור/הרשאות ונסו שוב'); }}>הוסף חבר</button>
      </Card>
      {members.map((mem) => <MemberRow key={mem.id} mem={mem} paid={paid(mem)} sid={sid} track={track} onPay={(a, me) => receipt(mem.name, mem.idn, a, 'dues:' + mem.id, me)} />)}

      {feat('customPaymentGateway') ? (
        <Card fold title="סנכרון סליקה (ייבוא)">
          <div className="mu">שורות מייצוא הספק: שם,ת״ז,סכום,אסמכתא. אסמכתא קיימת לא תיובא פעמיים. סנכרון חי ב-API דורש Cloud Function עם מפתחות הספק.</div>
          <textarea style={{ direction: 'ltr' }} value={csv} onChange={(e) => setCsv(e.target.value)} /><button className="b g" onClick={importCsv}>ייבוא</button> {info}
        </Card>) : <Lock title="סנכרון סליקה (נדרים פלוס / משולם / Grow)" />}

      <Card title={`סיכום ${year}`}>דמי חבר: {ils(receipts.filter((r) => (r.kind || '').startsWith('dues') && (r.date || '').startsWith(year)).reduce((a, r) => a + (+r.amount || 0), 0))} · תרומות: {ils(donations.filter((d) => (d.date || '').startsWith(year)).reduce((a, d) => a + (+d.amount || 0), 0))}</Card>
      <b>קבלות</b>
      {[...receipts].sort((a, b) => (b.no || 0) - (a.no || 0)).map((r) => <Card key={r.id} className="row"><span style={{ flex: '3 1 160px' }}>#{r.no} · {r.name} · {ils(r.amount)}<br /><small style={{ color: 'var(--mu)' }}>{r.date}</small></span><button className="b g" style={{ flex: '0 0 auto' }} onClick={() => setRc(r)}>הצג/הדפס</button></Card>)}
      {rc && (
        <div className="pv rcm"><div className="rcp">
          <h2>{org.name || 'בית הכנסת'}</h2><div>{org.ngo && 'עמותה מס׳ ' + org.ngo}</div><h3>קבלה מס׳ {rc.no}</h3><div>תאריך: {rc.date}</div>
          <p>התקבל מאת: <b>{rc.name}</b>{rc.idn && ' · ת״ז ' + rc.idn}<br />סכום: <b>{ils(rc.amount)}</b>{rc.method && ' · ' + rc.method}</p>
          <small>{rc.t46 && org.s46 ? 'מוסד מוכר לצרכי סעיף 46 לפקודת מס הכנסה, אישור מס׳ ' + org.s46 : 'קבלה ללא זיכוי מס'}. טיוטה: יש לאמת מול רואה חשבון ורשות המסים.</small>
          <div className="row noprt" style={{ marginTop: 12 }}><button className="b" onClick={() => window.print()}>הדפס</button><button className="b g" onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(`קבלה מס׳ ${rc.no} · ${org.name || 'בית הכנסת'}\nמאת: ${rc.name}\nסכום: ${ils(rc.amount)}\nתאריך: ${rc.date}`), '_blank')}>שלח ב-WhatsApp</button><button className="b g" onClick={() => setRc(null)}>סגור</button></div>
        </div></div>)}
    </div>);
}

function MemberRow({ mem, paid, sid, onPay, track }) {
  const bal = (+mem.fee || 0) - paid, [a, setA] = useState(''), [me, setMe] = useState('מזומן');
  return (
    <Card>
      <div className="row"><b style={{ flex: '2 1 120px' }}>{mem.name}</b><span className={`tag ${bal <= 0 ? 'ok' : 'bad'}`}>{bal <= 0 ? 'שולם' : 'חוב ' + ils(bal)}</span><span className="mu">{ils(paid)} מתוך {ils(mem.fee)}</span></div>
      <div className="row"><input type="number" placeholder="סכום ₪" value={a} onChange={(e) => setA(e.target.value)} />
        <select value={me} onChange={(e) => setMe(e.target.value)}><option>מזומן</option><option>אשראי</option><option>הוראת קבע</option><option>העברה</option></select>
        <button className="b" style={{ flex: '0 0 auto' }} onClick={() => { if (+a > 0) { onPay(+a, me); setA(''); } }}>קבל + קבלה</button>
        <button className="b d" style={{ flex: '0 0 auto' }} onClick={() => { if (confirm('למחוק? הפעולה אינה ניתנת לשחזור.')) track(delItem(sid, 'members', mem.id)); }}>מחק</button></div>
    </Card>);
}
