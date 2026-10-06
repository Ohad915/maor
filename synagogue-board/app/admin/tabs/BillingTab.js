'use client';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addItem, delItem, setPrivate } from '@/lib/db';
import { useCol } from '@/lib/hooks';
import { Card, Lock, Range, TextIn } from '../components/UI';

const ils = (n) => (+n || 0).toLocaleString('he-IL') + ' ₪';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

/** Billing & QR: org details, donation QR settings, dues, receipts, clearing-house import. */
export default function BillingTab({ ctx }) {
  const { sid, st, set, feat } = ctx;
  const [org, setOrg] = useState({}), [rc, setRc] = useState(null), [m, setM] = useState({ name: '', idn: '', fee: '' }), [csv, setCsv] = useState(''), [info, setInfo] = useState('');
  const members = useCol(sid, 'members'), receipts = useCol(sid, 'receipts'), donations = useCol(sid, 'donations');
  useEffect(() => onSnapshot(doc(db, 'synagogues', sid, 'private', 'org'), (d) => setOrg(d.data() || {})), [sid]);
  const year = String(new Date().getFullYear());

  async function receipt(name, idn, amount, kind, method) {
    const ref = doc(db, 'synagogues', sid, 'private', 'counters');
    const no = await runTransaction(db, async (tx) => { const n = ((await tx.get(ref)).data()?.receipt || 0) + 1; tx.set(ref, { receipt: n }, { merge: true }); return n; });
    const r = { no, name, idn, amount: +amount, kind, method, date: today(), t46: !!org.s46 };
    await addItem(sid, 'receipts', r); setRc(r);
  }
  const paid = (mem) => receipts.filter((r) => r.kind === 'dues:' + mem.id && r.date.startsWith(year)).reduce((a, r) => a + r.amount, 0);
  const importCsv = async () => {
    const have = new Set(donations.map((d) => d.ref).filter(Boolean)); let n = 0;
    for (const l of csv.split('\n')) { const q = l.split(',').map((x) => x.trim()); if (q[0] && +q[2] > 0 && !(q[3] && have.has(q[3]))) { await addItem(sid, 'donations', { name: q[0], idn: q[1], amount: +q[2], ref: q[3] || '', date: today() }); n++; } }
    setInfo(`יובאו ${n} רשומות`);
  };
  return (
    <div className="admin-root">
      <Card title="פינת התרומה (QR) במסך">
        <label>כותרת התרומה</label><TextIn value={st.donTitle} placeholder="תרומה מהירה לבית הכנסת" onSave={(v) => set('donTitle', v)} />
        <label>טקסט מתחת ל-QR</label><TextIn value={st.donSub} placeholder="סרקו בנייד לתרומה מאובטחת" onSave={(v) => set('donSub', v)} />
        <label>קישור תשלום (URL)</label><TextIn value={st.payUrl} style={{ direction: 'ltr' }} onSave={(v) => set('payUrl', v)} />
        <Range label="גודל קוביית ה-QR %" min={50} max={150} value={st.qs} onChange={(v) => set('qs', v)} />
      </Card>
      <Card title="פרטי עמותה לקבלות">
        <label>שם העמותה</label><TextIn value={org.name} onSave={(v) => setPrivate(sid, 'org', { name: v })} />
        <div className="row"><div><label>מס׳ עמותה</label><TextIn value={org.ngo} onSave={(v) => setPrivate(sid, 'org', { ngo: v })} /></div><div><label>מס׳ אישור סעיף 46</label><TextIn value={org.s46} onSave={(v) => setPrivate(sid, 'org', { s46: v })} /></div></div>
        <label>ספק סליקה</label>
        <select value={org.provider || 'nedarim'} onChange={(e) => setPrivate(sid, 'org', { provider: e.target.value })}><option value="nedarim">נדרים פלוס</option><option value="mesulam">משולם</option><option value="grow">Grow</option></select>
      </Card>

      <Card title="הוספת חבר">
        <div className="row"><input placeholder="שם" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /><input placeholder="ת״ז (לקבלה)" value={m.idn} onChange={(e) => setM({ ...m, idn: e.target.value })} /><input type="number" placeholder="דמי חבר שנתיים ₪" value={m.fee} onChange={(e) => setM({ ...m, fee: e.target.value })} /></div>
        <button className="b" onClick={() => { if (m.name.trim()) { addItem(sid, 'members', { ...m, fee: +m.fee || 0 }); setM({ name: '', idn: '', fee: '' }); } }}>הוסף חבר</button>
      </Card>
      {members.map((mem) => <MemberRow key={mem.id} mem={mem} paid={paid(mem)} sid={sid} onPay={(a, me) => receipt(mem.name, mem.idn, a, 'dues:' + mem.id, me)} />)}

      {feat('customPaymentGateway') ? (
        <Card title="סנכרון סליקה (ייבוא)">
          <div style={{ color: 'var(--mu)', fontSize: 13 }}>שורות מייצוא הספק: שם,ת״ז,סכום,אסמכתא. אסמכתא קיימת לא תיובא פעמיים. סנכרון חי ב-API דורש Cloud Function עם מפתחות הספק.</div>
          <textarea style={{ direction: 'ltr' }} value={csv} onChange={(e) => setCsv(e.target.value)} /><button className="b g" onClick={importCsv}>ייבוא</button> {info}
        </Card>) : <Lock title="סנכרון סליקה (נדרים פלוס / משולם / Grow)" />}

      <Card title={`סיכום ${year}`}>דמי חבר: {ils(receipts.filter((r) => r.kind.startsWith('dues') && r.date.startsWith(year)).reduce((a, r) => a + r.amount, 0))} · תרומות: {ils(donations.filter((d) => (d.date || '').startsWith(year)).reduce((a, d) => a + d.amount, 0))}</Card>
      <b>קבלות</b>
      {[...receipts].sort((a, b) => b.no - a.no).map((r) => <Card key={r.id} className="row"><span style={{ flex: '3 1 160px' }}>#{r.no} · {r.name} · {ils(r.amount)}<br /><small style={{ color: 'var(--mu)' }}>{r.date}</small></span><button className="b g" style={{ flex: '0 0 auto' }} onClick={() => setRc(r)}>הצג/הדפס</button></Card>)}
      {rc && (
        <div className="pv rcm"><div className="rcp">
          <h2>{org.name || 'בית הכנסת'}</h2><div>{org.ngo && 'עמותה מס׳ ' + org.ngo}</div><h3>קבלה מס׳ {rc.no}</h3><div>תאריך: {rc.date}</div>
          <p>התקבל מאת: <b>{rc.name}</b>{rc.idn && ' · ת״ז ' + rc.idn}<br />סכום: <b>{ils(rc.amount)}</b>{rc.method && ' · ' + rc.method}</p>
          <small>{rc.t46 && org.s46 ? 'מוסד מוכר לצרכי סעיף 46 לפקודת מס הכנסה, אישור מס׳ ' + org.s46 : 'קבלה ללא זיכוי מס'}. טיוטה: יש לאמת מול רואה חשבון ורשות המסים.</small>
          <div className="row noprt" style={{ marginTop: 12 }}><button className="b" onClick={() => window.print()}>הדפס</button><button className="b g" onClick={() => setRc(null)}>סגור</button></div>
        </div></div>)}
    </div>);
}

function MemberRow({ mem, paid, sid, onPay }) {
  const bal = mem.fee - paid, [a, setA] = useState(''), [me, setMe] = useState('מזומן');
  return (
    <Card>
      <div className="row"><b style={{ flex: '2 1 120px' }}>{mem.name}</b><span className={`tag ${bal <= 0 ? 'ok' : 'bad'}`}>{bal <= 0 ? 'שולם' : 'חוב ' + ils(bal)}</span><span style={{ color: 'var(--mu)', fontSize: 13 }}>{ils(paid)} מתוך {ils(mem.fee)}</span></div>
      <div className="row"><input type="number" placeholder="סכום ₪" value={a} onChange={(e) => setA(e.target.value)} />
        <select value={me} onChange={(e) => setMe(e.target.value)}><option>מזומן</option><option>אשראי</option><option>הוראת קבע</option><option>העברה</option></select>
        <button className="b" style={{ flex: '0 0 auto' }} onClick={() => { if (+a > 0) { onPay(+a, me); setA(''); } }}>קבל + קבלה</button>
        <button className="b d" style={{ flex: '0 0 auto' }} onClick={() => delItem(sid, 'members', mem.id)}>מחק</button></div>
    </Card>);
}
