'use client';
import { useState } from 'react';
import { addItem, delItem, updItem } from '@/lib/db';
import { useCol } from '@/lib/hooks';
import { Card } from '../components/UI';

const ils = (n) => (+n || 0).toLocaleString('he-IL') + ' ₪';
const ST = ['חדש', 'בטיפול', 'טופל'];
const Del = ({ onClick }) => <button className="b d" style={{ flex: '0 0 auto' }} onClick={onClick}>מחק</button>;

export function MaintenanceTab({ ctx: { sid } }) {
  const tickets = useCol(sid, 'tickets'), inv = useCol(sid, 'inventory');
  const [t, setT] = useState({ title: '', loc: '' }), [i, setI] = useState({ name: '', qty: '', min: '' });
  const low = inv.filter((x) => x.qty <= x.min);
  return (<>
    {low.length > 0 && <Card className="" ><span style={{ color: 'var(--bad)' }}>⚠ מלאי עומד להסתיים: {low.map((x) => x.name).join(', ')}</span></Card>}
    <Card title="קריאת שירות / תקלה">
      <div className="row"><input placeholder="תקלה" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} /><input placeholder="מיקום" value={t.loc} onChange={(e) => setT({ ...t, loc: e.target.value })} /></div>
      <button className="b" onClick={() => { if (t.title.trim()) { addItem(sid, 'tickets', { ...t, st: 0, by: 'גבאי' }); setT({ title: '', loc: '' }); } }}>הוסף קריאה</button>
    </Card>
    {tickets.map((k) => <Card key={k.id} className="row"><div style={{ flex: '3 1 180px' }}><b>{k.title}</b> <span className={`tag ${k.st === 2 ? 'ok' : k.st === 0 ? 'bad' : ''}`}>{ST[k.st]}</span><div style={{ color: 'var(--mu)', fontSize: 13 }}>{k.loc} · {k.by}</div></div>
      {k.st < 2 && <button className="b g" style={{ flex: '0 0 auto' }} onClick={() => updItem(sid, 'tickets', k.id, { st: k.st + 1 })}>{k.st ? 'סמן טופל' : 'התחל טיפול'}</button>}<Del onClick={() => delItem(sid, 'tickets', k.id)} /></Card>)}
    <h3 style={{ margin: '14px 0 6px' }}>מלאי</h3>
    <Card><div className="row"><input placeholder="פריט" value={i.name} onChange={(e) => setI({ ...i, name: e.target.value })} /><input type="number" placeholder="כמות" value={i.qty} onChange={(e) => setI({ ...i, qty: e.target.value })} /><input type="number" placeholder="התראה מתחת ל-" value={i.min} onChange={(e) => setI({ ...i, min: e.target.value })} /></div>
      <button className="b" onClick={() => { if (i.name.trim()) { addItem(sid, 'inventory', { name: i.name, qty: +i.qty || 0, min: +i.min || 0 }); setI({ name: '', qty: '', min: '' }); } }}>הוסף פריט</button></Card>
    {inv.map((x) => <Card key={x.id} className="row"><b style={{ flex: '2 1 120px' }}>{x.name}</b>{x.qty <= x.min && <span className="tag bad">עומד להסתיים</span>}
      <button className="b g" style={{ flex: '0 0 auto' }} onClick={() => updItem(sid, 'inventory', x.id, { qty: Math.max(0, x.qty - 1) })}>−</button><b style={{ flex: '0 0 40px', textAlign: 'center' }}>{x.qty}</b>
      <button className="b g" style={{ flex: '0 0 auto' }} onClick={() => updItem(sid, 'inventory', x.id, { qty: x.qty + 1 })}>+</button><Del onClick={() => delItem(sid, 'inventory', x.id)} /></Card>)}
  </>);
}

const CATS = ['חשמל', 'מים', 'אינטרנט', 'ניקיון', 'ספרים', 'אחר'];
export function BudgetTab({ ctx: { sid, st, set } }) {
  const ex = useCol(sid, 'expenses'), [m, setM] = useState(new Date().toISOString().slice(0, 7));
  const [e, setE] = useState({ cat: CATS[0], amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  const sum = (p, c) => ex.filter((x) => x.date.startsWith(p) && (!c || x.cat === c)).reduce((a, x) => a + x.amount, 0);
  const bud = (c) => st.budget?.[c] ?? 0;
  const table = (p, div) => CATS.map((c) => { const a = sum(p, c), b = bud(c) / div; return <div className="row" key={c}><span>{c}</span><span>{ils(a)}</span><span className={`tag ${b && a > b ? 'bad' : 'ok'}`}>{ils(b)}</span></div>; });
  return (<>
    <Card title="הוצאה חדשה">
      <div className="row"><select value={e.cat} onChange={(x) => setE({ ...e, cat: x.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select><input type="number" placeholder="סכום ₪" value={e.amount} onChange={(x) => setE({ ...e, amount: x.target.value })} /><input type="date" value={e.date} onChange={(x) => setE({ ...e, date: x.target.value })} /></div>
      <input placeholder="הערה" value={e.note} onChange={(x) => setE({ ...e, note: x.target.value })} />
      <button className="b" onClick={() => { if (+e.amount > 0) { addItem(sid, 'expenses', { ...e, amount: +e.amount }); setE({ ...e, amount: '', note: '' }); } }}>הוסף הוצאה</button>
    </Card>
    <Card><label>חודש לדוח</label><input type="month" value={m} onChange={(x) => setM(x.target.value)} /><b>דוח חודשי {m} (בפועל / תקציב)</b>{table(m, 12)}</Card>
    <Card><b>דוח שנתי {m.slice(0, 4)}</b>{table(m.slice(0, 4), 1)}</Card>
    <Card title="תקציב שנתי לקטגוריה">{CATS.map((c) => <div className="row" key={c}><span>{c}</span><input type="number" defaultValue={bud(c)} onBlur={(x) => set(`budget.${c}`, +x.target.value)} /></div>)}</Card>
    {[...ex].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20).map((x) => <Card key={x.id} className="row"><span style={{ flex: '3 1 160px' }}>{x.cat} · {ils(x.amount)}<br /><small style={{ color: 'var(--mu)' }}>{x.date} {x.note}</small></span><Del onClick={() => delItem(sid, 'expenses', x.id)} /></Card>)}
  </>);
}
