'use client';
import { useRef, useState } from 'react';
import { addItem, delItem, updItem } from '@/lib/db';
import { LAYOUTS, SCREEN_NAMES } from '@/lib/types';
import { gem, hebOf, monthName, refuahOn, resolveSpan } from '@/lib/hebrew';
import { Card, DisplayCfg, HebPick, Lock, ModeSel, Range, ScreenSel, Switch, TextIn, parseY } from '../components/UI';
import BlockDesignAccordion from '../components/BlockDesignAccordion';
import WhatsAppImage from '../components/WhatsAppImage';

const SUBS = [['prsh', 'פרשת שבוע'], ['hal', 'הלכה יומית'], ['ann', 'הודעות ואירועים'], ['mem', 'הנצחות ולעילוי נשמת'], ['rf', '🏥 רפואה שלמה'], ['pr', 'זמני תפילות'], ['dsg', 'עיצוב']];
const Del = ({ onClick }) => <button className="b d" style={{ flex: '0 0 auto' }} onClick={onClick}>מחק</button>;
const Edit = ({ onClick, on }) => <button className="b g" style={{ flex: '0 0 auto' }} onClick={onClick}>{on ? 'סגור עריכה' : 'ערוך'}</button>;
const modeVal = (x) => x.mode ?? (x.on === false ? 'off' : 'block');
const HB = { d: 1, m: 'Tishri' };
/** Form that is used both for adding and for editing an existing item (refilled by the "ערוך" button). */
function useEditor(blank) {
  const [f, setF] = useState(blank), [eid, setEid] = useState(null), ref = useRef(null);
  return { f, setF, eid, ref,
    load: (item, id) => { setF({ ...blank, ...item }); setEid(id); ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    reset: () => { setF(blank); setEid(null); } };
}
const FormBtns = ({ ed, onSave, label }) => (
  <div className="row"><button className="b" onClick={onSave}>{ed.eid ? 'עדכן' : label}</button>{ed.eid && <button className="b g" onClick={ed.reset}>בטל עריכה</button>}</div>);

export default function ScreenTab({ ctx }) {
  const { role } = ctx;
  const [sub, setSub] = useState('prsh');
  const cur = role === 'sub_gabbai' ? 'ann' : sub;
  return (
    <>
      <h2 style={{ margin: '0 0 8px' }}>ניהול המסך הראשי</h2>
      {role !== 'sub_gabbai' && <div className="row" style={{ marginBottom: 10, gap: 6 }}>{SUBS.map(([k, l]) => <button key={k} className={`b ${cur === k ? '' : 'g'}`} style={{ flex: '0 0 auto', padding: '8px 12px' }} onClick={() => setSub(k)}>{l}</button>)}</div>}
      {cur === 'prsh' && <Parsha {...ctx} />}{cur === 'hal' && <Halacha {...ctx} />}{cur === 'ann' && <Announcements {...ctx} />}
      {cur === 'mem' && <Memorials {...ctx} />}{cur === 'rf' && <Refuah {...ctx} />}{cur === 'pr' && <Prayers {...ctx} />}{cur === 'dsg' && <Design {...ctx} />}
    </>);
}

function Parsha({ st, set }) {
  return (<>
    <DisplayCfg st={st} set={set} k="pr" />
    <Card title="פרשת השבוע">
      <Switch label="הצגת רכיב הפרשה" on={st.vis?.pr !== false} onChange={(v) => set('vis.pr', v)} />
      <label>מצב</label>
      <div className="row">{[['auto', 'חישוב אוטומטי'], ['manual', 'הזנה ידנית']].map(([k, l]) => <button key={k} className={`b ${st.pMode === k ? '' : 'g'}`} onClick={() => set('pMode', k)}>{l}</button>)}</div>
      <label>שם פרשה / אירוע (במצב ידני)</label><TextIn value={st.pTitle} onSave={(v) => set('pTitle', v)} placeholder="פרשת בראשית" />
      <label>כותרת משנה</label><TextIn value={st.pSub} onSave={(v) => set('pSub', v)} placeholder="שבת חתן" />
      <Switch label="להציג גם כשקופית בקרוסלה" on={st.pSlide} onChange={(v) => set('pSlide', v)} />
    </Card></>);
}

function Halacha({ sid, st, set, cols }) {
  const ed = useEditor({ title: '', text: '', screen: 'all' }), { f, setF } = ed;
  const am = st.hl.autoMode ?? (st.hl.auto === false || st.hl.mode === 'off' ? 'off' : st.hl.mode === 'full' ? 'full' : 'block');
  const save = () => { if (!f.title.trim()) return; ed.eid ? updItem(sid, 'halacha', ed.eid, f) : addItem(sid, 'halacha', { ...f, mode: 'block' }); ed.reset(); };
  return (<>
    <DisplayCfg st={st} set={set} k="hal" />
    <Card title="מנהגי היום / תזכורות בתפילה (הפס העליון)">
      <Switch label="הצגת הפס במסך" on={st.vis?.cu !== false} onChange={(v) => set('vis.cu', v)} />
      <div className="row">{[['auto', 'אוטומטי'], ['both', 'אוטומטי + ידני'], ['manual', 'ידני בלבד']].map(([k, l]) => <button key={k} className={`b ${(st.customs?.mode || 'auto') === k ? '' : 'g'}`} onClick={() => set('customs.mode', k)}>{l}</button>)}</div>
      <label>טקסט ידני (שורה לכל תזכורת)</label><TextIn area value={st.customs?.text} onSave={(v) => set('customs.text', v)} />
    </Card>
    <Card title='שקופית "מנהגי היום" האוטומטית'>
      <div className="row">{[['off', 'כבוי'], ['block', 'בלוק בקרוסלה'], ['full', 'מסך מלא']].map(([k, l]) => <button key={k} className={`b ${am === k ? '' : 'g'}`} onClick={() => set('hl.autoMode', k)}>{l}</button>)}</div>
      <Range label="שורות בעמוד (טקסט ארוך מתחלק לעמודים)" min={2} max={14} value={st.lpp || 6} onChange={(v) => set('lpp', v)} />
    </Card>
    <div ref={ed.ref}><Card title={ed.eid ? 'עריכת הלכה' : 'הלכה חדשה'}>
      <label>כותרת</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label>תוכן (ירידות שורה נשמרות)</label><textarea value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
      <label>מסך</label><ScreenSel value={f.screen} onChange={(v) => setF({ ...f, screen: v })} />
      <FormBtns ed={ed} onSave={save} label="הוסף" />
    </Card></div>
    {(cols.halacha || []).map((i) => (
      <Card key={i.id}><div className="row"><div style={{ flex: '3 1 200px' }}><b>{i.title}</b><div style={{ color: 'var(--mu)', fontSize: 14, whiteSpace: 'pre-line' }}>{i.text}</div></div></div>
        <div className="row"><ModeSel value={modeVal(i)} onChange={(v) => updItem(sid, 'halacha', i.id, { mode: v })} /><ScreenSel value={i.screen} onChange={(v) => updItem(sid, 'halacha', i.id, { screen: v })} />
          <Edit onClick={() => ed.load({ title: i.title, text: i.text || '', screen: i.screen || 'all' }, i.id)} /><Del onClick={() => delItem(sid, 'halacha', i.id)} /></div></Card>))}
  </>);
}

function Announcements({ sid, st, set, cols, role, feat, syn }) {
  const ed = useEditor({ title: '', content: '', screen: 'all', limited: false, from: HB, to: HB }), { f, setF } = ed;
  const save = () => { if (!f.title.trim()) return; ed.eid ? updItem(sid, 'announcements', ed.eid, f) : addItem(sid, 'announcements', { ...f, mode: 'block' }); ed.reset(); };
  return (<>
    {role !== 'sub_gabbai' && <WhatsAppImage syn={syn} cols={cols} st={st} />}
    {role !== 'sub_gabbai' && <DisplayCfg st={st} set={set} k="ann" />}
    {role !== 'sub_gabbai' && <Card><Range label="שורות בעמוד (טקסט ארוך מתחלק לעמודים)" min={2} max={14} value={st.lpp || 6} onChange={(v) => set('lpp', v)} /></Card>}
    {role !== 'sub_gabbai' && (feat('runningTicker')
      ? <Card title="סרגל עדכונים נע"><TextIn value={st.tkText} onSave={(v) => set('tkText', v)} placeholder="טקסט שיגלול בתחתית המסך" /><label>מסך</label><ScreenSel value={st.tkScreen} onChange={(v) => set('tkScreen', v)} /><Switch label="הצגה" on={st.vis?.tk !== false} onChange={(v) => set('vis.tk', v)} /></Card>
      : <Lock title="סרגל עדכונים נע" />)}
    <div ref={ed.ref}><Card title={ed.eid ? 'עריכת הודעה' : 'הודעה חדשה'}>
      <label>כותרת</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label>תוכן (ירידות שורה נשמרות)</label><textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
      <label>מסך</label><ScreenSel value={f.screen} onChange={(v) => setF({ ...f, screen: v })} />
      <label><input type="checkbox" style={{ width: 'auto' }} checked={f.limited} onChange={(e) => setF({ ...f, limited: e.target.checked })} /> הגבל תוקף לפי תאריך עברי (חוזר מדי שנה)</label>
      {f.limited && <><label>מ- (יום וחודש עברי)</label><HebPick value={f.from} onChange={(v) => setF({ ...f, from: v })} /><label>עד</label><HebPick value={f.to} onChange={(v) => setF({ ...f, to: v })} /></>}
      <FormBtns ed={ed} onSave={save} label="הוסף הודעה" />
    </Card></div>
    {(cols.announcements || []).map((a) => (
      <Card key={a.id}><div style={{ flex: '3 1 200px' }}><b>{a.title}</b><div style={{ color: 'var(--mu)', fontSize: 14, whiteSpace: 'pre-line' }}>{a.content}</div>
        <span className="tag">{a.screen === 'all' || !a.screen ? 'כל המסכים' : SCREEN_NAMES[a.screen]}</span>{a.limited && <span className="tag">{gem(a.from.d)} {monthName(a.from.m)} – {gem(a.to.d)} {monthName(a.to.m)}</span>}</div>
        <div className="row"><ModeSel value={modeVal(a)} onChange={(v) => updItem(sid, 'announcements', a.id, { mode: v })} />
          <Edit onClick={() => ed.load({ title: a.title, content: a.content || '', screen: a.screen || 'all', limited: !!a.limited, from: a.from || HB, to: a.to || HB }, a.id)} /><Del onClick={() => delItem(sid, 'announcements', a.id)} /></div></Card>))}
  </>);
}

function Memorials({ sid, st, set, cols, feat }) {
  const ed = useEditor({ name: '', desc: '', screen: 'all', gender: 'm', mode: 'y', d: 1, month: 'Tishri', y: '', from: HB, to: HB }), { f, setF } = ed;
  const mems = cols.memorials || [], limited = !ed.eid && mems.length >= 10 && !feat('unlimitedMemorials');
  const h = hebOf(new Date(), false);
  const save = () => {
    if (!f.name.trim()) return;
    const data = { name: f.name, desc: f.desc, screen: f.screen, gender: f.gender, mode: f.mode, d: f.d, month: f.month, y: parseY(f.y), from: f.from, to: f.to };
    ed.eid ? updItem(sid, 'memorials', ed.eid, data) : addItem(sid, 'memorials', data); ed.reset();
  };
  return (<>
    <DisplayCfg st={st} set={set} k="mem" />
    <Card title="רכיב ההנצחה">
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>כותרת הבלוק: 🕯 לעילוי נשמת. ביום הפטירה העברי השם מוצג אוטומטית.</div>
      <Range label="שמות בעמוד" min={1} max={8} value={st.ipp?.yz || 3} onChange={(v) => set('ipp.yz', v)} />
      <Switch label="הצגת פינת ההנצחה" on={st.vis?.yz !== false} onChange={(v) => set('vis.yz', v)} />
      <Switch label="הקפצה בקרוסלה ביום הפטירה" on={st.vis?.memPop !== false} onChange={(v) => set('vis.memPop', v)} />
    </Card>
    <div ref={ed.ref}>{limited ? <Lock title="הנצחות ללא הגבלה (מעל 10)" /> : (
      <Card title={ed.eid ? 'עריכת הנצחה' : 'הנצחה חדשה'}>
        <label>שם הנפטר/ת</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label>הקדשה (רשות, ירידות שורה נשמרות)</label><textarea value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} />
        <label>מסך</label><ScreenSel value={f.screen} onChange={(v) => setF({ ...f, screen: v })} />
        <div className="row"><div><label>מין</label><select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="m">זכר</option><option value="f">נקבה</option></select></div>
          <div><label>אופן הצגה</label><select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}><option value="y">ביום הפטירה העברי</option><option value="r">בטווח תאריכים עברי</option><option value="p">קבוע (ללא תאריך)</option></select></div></div>
        {f.mode === 'y' && <><label>תאריך פטירה (יום, חודש, שנה עברית רשות)</label><HebPick value={{ d: f.d, m: f.month }} onChange={(v) => setF({ ...f, d: v.d, month: v.m })} /><input placeholder="תשפ״ה או 5785" value={f.y} onChange={(e) => setF({ ...f, y: e.target.value })} /></>}
        {f.mode === 'r' && <><label>מ-</label><HebPick value={f.from} onChange={(v) => setF({ ...f, from: v })} /><label>עד</label><HebPick value={f.to} onChange={(v) => setF({ ...f, to: v })} /></>}
        <FormBtns ed={ed} onSave={save} label="הוסף הנצחה" />
      </Card>)}</div>
    {mems.map((m) => <Card key={m.id}><div style={{ flex: '3 1 200px' }}><b>{m.name}</b>{m.desc && <small style={{ whiteSpace: 'pre-line' }}> {m.desc}</small>}
      <div style={{ color: 'var(--mu)' }}>{m.mode === 'p' ? 'הצגה קבועה' : m.mode === 'r' ? `בטווח ${gem(m.from.d)} ${monthName(m.from.m)} – ${gem(m.to.d)} ${monthName(m.to.m)}` : `${gem(m.d)} ב${monthName(m.month)}${m.y ? ' ' + gem(m.y % 1000) : ''}${m.y && h.y > m.y ? ` · ${h.y - m.y} שנים` : ''}`}</div></div>
      <div className="row"><ScreenSel value={m.screen} onChange={(v) => updItem(sid, 'memorials', m.id, { screen: v })} />
        <Edit onClick={() => ed.load({ name: m.name, desc: m.desc || '', screen: m.screen || 'all', gender: m.gender || 'm', mode: m.mode || 'y', d: m.d || 1, month: m.month || 'Tishri', y: m.y ? String(m.y) : '', from: m.from || HB, to: m.to || HB }, m.id)} />
        <Del onClick={() => delItem(sid, 'memorials', m.id)} /></div></Card>)}
  </>);
}

function Refuah({ sid, st, set, cols }) {
  const ed = useEditor({ name: '', note: '', screen: 'all', from: HB, to: { d: 30, m: 'Tishri' } }), { f, setF } = ed;
  const h = hebOf(new Date(), false);
  const save = () => {
    if (!f.name.trim()) return;
    const data = { ...f, ...resolveSpan(f.from, f.to, h) };
    ed.eid ? updItem(sid, 'refuah', ed.eid, data) : addItem(sid, 'refuah', data); ed.reset();
  };
  return (<>
    <DisplayCfg st={st} set={set} k="rf" />
    <Card title="🏥 רפואה שלמה">
      <Range label="שמות בעמוד" min={1} max={8} value={st.ipp?.rf || 3} onChange={(v) => set('ipp.rf', v)} />
      <Switch label="הצגת הבלוק במסך" on={st.vis?.rf !== false} onChange={(v) => set('vis.rf', v)} />
      <Switch label="הקפצה בקרוסלת ההודעות" on={st.vis?.rfPop !== false} onChange={(v) => set('vis.rfPop', v)} />
    </Card>
    <div ref={ed.ref}><Card title={ed.eid ? 'עריכת שם' : 'שם חדש'}>
      <label>שם החולה/ה (כולל שם האם)</label><input value={f.name} placeholder="פלוני בן פלונית" onChange={(e) => setF({ ...f, name: e.target.value })} />
      <label>בקשה / תפילה קצרה (רשות)</label><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <label>מסך</label><ScreenSel value={f.screen} onChange={(v) => setF({ ...f, screen: v })} />
      <label>תוקף מ- (יום וחודש עברי)</label><HebPick value={f.from} onChange={(v) => setF({ ...f, from: v })} />
      <label>עד</label><HebPick value={f.to} onChange={(v) => setF({ ...f, to: v })} />
      <FormBtns ed={ed} onSave={save} label="הוסף" />
    </Card></div>
    {(cols.refuah || []).map((r) => { const on = refuahOn(r, h); return (
      <Card key={r.id}><div style={{ flex: '3 1 200px' }}><b>{r.name}</b>{r.note && <small> {r.note}</small>}<div style={{ color: 'var(--mu)', fontSize: 13 }}>{gem(r.from.d)} {monthName(r.from.m)} – {gem(r.to.d)} {monthName(r.to.m)} <span className={`tag ${on ? 'ok' : ''}`}>{on ? 'פעיל' : 'לא פעיל / פג'}</span></div></div>
        <div className="row"><ScreenSel value={r.screen} onChange={(v) => updItem(sid, 'refuah', r.id, { screen: v })} />
          <Edit onClick={() => ed.load({ name: r.name, note: r.note || '', screen: r.screen || 'all', from: r.from, to: r.to }, r.id)} /><Del onClick={() => delItem(sid, 'refuah', r.id)} /></div></Card>); })}
  </>);
}

const DAYS = { week: 'חול', fri: 'ערב שבת', shab: 'שבת/חג', mots: 'מוצ״ש', all: 'תמיד' };
function Prayers({ sid, cols, st, set, syn }) {
  const [open, setOpen] = useState(null);
  const oe = useEditor({ prayerId: '', kind: 'rc', time: '06:00', day: 1, month: 'Tishri' }), o = oe.f, setO = oe.setF;
  const pr = cols.prayers || [];
  const saveOv = () => { if (!o.prayerId) return; oe.eid ? updItem(sid, 'overrides', oe.eid, o) : addItem(sid, 'overrides', o); oe.reset(); };
  return (<>
    <WhatsAppImage syn={syn} cols={cols} st={st} />
    <p style={{ color: 'var(--mu)', fontSize: 14 }}>זמן קבוע (06:15) או יחסי לשקיעה/הנץ בדקות (למשל -20). מחושב בדקה מדויקת לפי המיקום, ללא עיגול. לכל שורה אפשר לבחור: כבוי / בסרגל התחתון / בלוק בקרוסלה / מסך מלא.</p>
    <Card title="כל זמני התפילות כשקופית">
      <label>אופן תצוגה</label>
      <ModeSel popup value={st.ptAll?.mode || 'off'} onChange={(v) => set('ptAll.mode', v)} />
      <Range label="זמן תצוגה לשקופית (בשניות)" min={1} max={30} value={st.ptAll?.secs || 10} onChange={(v) => set('ptAll.secs', v)} />
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>הזמן חל על כל שקופיות התפילות (גם שורות בודדות שהוגדרו לקרוסלה או למסך מלא).</div>
    </Card>
    {pr.map((r) => (
      <Card key={r.id}>
        <div className="row"><b style={{ flex: '2 1 120px' }}>{r.name}</b><span className="tag">{DAYS[r.days]}</span><span style={{ direction: 'ltr' }}>{r.mode === 'fixed' ? r.val : `${r.mode === 'sunset' ? 'שקיעה' : 'הנץ'} ${+r.val > 0 ? '+' : ''}${r.val}`}</span>{r.note && <small style={{ color: 'var(--mu)' }}>{r.note}</small>}</div>
        <div className="row"><ModeSel bar value={r.show} onChange={(v) => updItem(sid, 'prayers', r.id, { show: v })} /><ScreenSel value={r.screen} onChange={(v) => updItem(sid, 'prayers', r.id, { screen: v })} />
          <Edit on={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)} /><Del onClick={() => delItem(sid, 'prayers', r.id)} /></div>
        {open === r.id && (
          <div className="row">
            <TextIn value={r.name} onSave={(v) => updItem(sid, 'prayers', r.id, { name: v })} />
            <select value={r.mode} onChange={(e) => updItem(sid, 'prayers', r.id, { mode: e.target.value })}><option value="fixed">קבוע</option><option value="sunset">משקיעה</option><option value="sunrise">מהנץ</option></select>
            <TextIn value={r.val} style={{ direction: 'ltr' }} onSave={(v) => updItem(sid, 'prayers', r.id, { val: v })} />
            <select value={r.days} onChange={(e) => updItem(sid, 'prayers', r.id, { days: e.target.value })}>{Object.entries(DAYS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <TextIn value={r.note} placeholder="הערה (רשות)" onSave={(v) => updItem(sid, 'prayers', r.id, { note: v })} />
          </div>)}
      </Card>))}
    <button className="b" onClick={async () => { const d = await addItem(sid, 'prayers', { name: 'תפילה חדשה', mode: 'fixed', val: '12:00', days: 'week', note: '', screen: 'all', show: 'bar' }); setOpen(d.id); }}>+ הוסף תפילה</button>
    <h3 style={{ margin: '14px 0 6px' }}>דריסת זמן נקודתית</h3>
    <div ref={oe.ref}><Card title={oe.eid ? 'עריכת דריסה' : null}>
      <div className="row"><div><label>תפילה</label><select value={o.prayerId} onChange={(e) => setO({ ...o, prayerId: e.target.value })}><option value="">—</option>{pr.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
        <div><label>מתי</label><select value={o.kind} onChange={(e) => setO({ ...o, kind: e.target.value })}><option value="rc">ראש חודש</option><option value="h">תאריך עברי (שנתי)</option></select></div>
        <div><label>שעה</label><input type="time" value={o.time} onChange={(e) => setO({ ...o, time: e.target.value })} /></div></div>
      {o.kind === 'h' && <HebPick value={{ d: o.day, m: o.month }} onChange={(v) => setO({ ...o, day: v.d, month: v.m })} />}
      <FormBtns ed={oe} onSave={saveOv} label="הוסף דריסה" />
    </Card></div>
    {(cols.overrides || []).map((x) => <Card key={x.id} className="row"><span style={{ flex: '3 1 160px' }}>{pr.find((r) => r.id === x.prayerId)?.name || '?'} ← <b>{x.time}</b> · {x.kind === 'rc' ? 'ראש חודש' : `${gem(x.day)} ${monthName(x.month)}`}</span>
      <Edit onClick={() => oe.load({ prayerId: x.prayerId, kind: x.kind, time: x.time, day: x.day || 1, month: x.month || 'Tishri' }, x.id)} /><Del onClick={() => delItem(sid, 'overrides', x.id)} /></Card>)}
  </>);
}

function Design({ sid, st, set }) {
  const up = (file) => {
    if (!file) return; const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); set('bg', c.toDataURL('image/jpeg', 0.6)); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  };
  const Btns = ({ k, opts }) => <div className="row">{opts.map(([v, l]) => <button key={v} className={`b ${st[k] === v ? '' : 'g'}`} onClick={() => set(k, v)}>{l}</button>)}</div>;
  const V = [['cr', 'כותרת עליונה'], ['hd', 'פס התאריך העליון'], ['zm', 'סרגל זמני היום'], ['pr', 'פרשת השבוע'], ['cu', 'מנהגי היום / תזכורות'], ['yz', 'לעילוי נשמת'], ['rf', 'רפואה שלמה'], ['qr', 'פינת QR לתרומות'], ['tk', 'סרגל עדכונים נע']];
  return (<>
    <Card title="כותרות"><label>כותרת עליונה (ריק = שם בית הכנסת)</label><TextIn value={st.title} onSave={(v) => set('title', v)} /></Card>
    <Card title="עיצוב מסך ראשי">
      <label>דגם פריסת מסך</label><select value={st.layout} onChange={(e) => set('layout', e.target.value)}>{LAYOUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <label>סגנון עיצוב הקוביות</label><select value={st.cardStyle || 'clean'} onChange={(e) => set('cardStyle', e.target.value)}>{[['gold', 'זהב יוקרתי (Golden Elegance)'], ['stone', 'אבן ירושלמית עתיקה (Jerusalem Stone)'], ['glass', 'זכוכית מודרנית (Glassmorphism)'], ['trad', 'מסורתי / תשמישי קדושה (Traditional)'], ['clean', 'נקי ומודרני (Minimalist)']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <label>סגנון מסגרת ועיטורים</label><select value={st.frame || 'royal'} onChange={(e) => set('frame', e.target.value)}>{[['royal', 'זהב מלכותי (Royal Gold)'], ['stone', 'אבני הכותל (Jerusalem Stone)'], ['temple', 'היכל ובית המקדש (Temple Pillars)'], ['ornament', 'ערבסק / תחרה מסורתית (Ornament)'], ['clean', 'נקי / ללא מסגרת (Clean)']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <label>ערכת נושא</label><Btns k="theme" opts={[['gold', 'זהב מלכותי'], ['classic', 'שיש קלאסי'], ['modern', 'מודרני כהה']]} />
      <label>זום כללי למסך</label><Btns k="zoom" opts={[[1, 'רגיל'], [1.25, 'גדול'], [1.5, 'ענק']]} />
      <label>אפקט מעבר</label><Btns k="anim" opts={[['fade', 'דהייה'], ['slide', 'החלקה'], ['none', 'ללא']]} />
      <label>צבע מבטא</label><div className="row"><input type="color" value={st.accent || '#f2c85b'} onChange={(e) => set('accent', e.target.value)} />{st.accent && <button className="b g" onClick={() => set('accent', '')}>איפוס</button>}</div>
      <label>תמונת רקע</label><input type="file" accept="image/*" onChange={(e) => up(e.target.files[0])} />{st.bg && <button className="b d" onClick={() => set('bg', '')}>הסר תמונה</button>}
    </Card>
    <Card title="רכיבים גלויים"><div style={{ color: 'var(--mu)', fontSize: 13 }}>הרכיב מוצג בכל ערכת נושא ובכל דגם. הוא נעלם רק אם כיבית אותו כאן.</div>{V.map(([k, l]) => <Switch key={k} label={l} on={st.vis?.[k] !== false} onChange={(v) => set(`vis.${k}`, v)} />)}</Card>
    <Card title="רוחב עמודות הצד"><Range label="רוחב %" min={20} max={50} value={st.side} onChange={(v) => set('side', v)} /></Card>
    <BlockDesignAccordion st={st} set={set} sid={sid} />
  </>);
}
