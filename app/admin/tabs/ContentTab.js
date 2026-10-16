'use client';
import { useRef, useState } from 'react';
import { addItem, delItem, updItem } from '@/lib/db';
import { SCREEN_NAMES } from '@/lib/types';
import { PDAYS, pdayOf, sortPrayers } from '@/lib/zmanim';
import { gem, hebOf, holNames, LDAY_NAMES, lessonDays, lessonDaysLabel, monthName, rdOf, refuahOn, resolveSpan } from '@/lib/hebrew';
import { DH_SOURCES, isLive, pickDaily } from '@/lib/dailyHalacha';
import { Card, HebPick, Lock, ModeSel, Range, ScreenSel, Switch, TextIn, parseY } from '../components/UI';

const Del = ({ onClick }) => <button className="b d" style={{ flex: '0 0 auto' }} onClick={onClick}>מחק</button>;
const TkChk = ({ on, onChange }) => <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, flex: '0 0 auto' }}><input type="checkbox" style={{ width: 'auto' }} checked={!!on} onChange={(e) => onChange(e.target.checked)} />בסרגל הרץ</label>;
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

const SUBS = [['prsh', '📜 פרשה והפטרה'], ['pr', '🕌 זמני תפילות'], ['les', '📚 שיעורי תורה'], ['ann', '📣 הודעות ומנהגים'], ['mem', '🕯️ הנצחות ורפואה שלמה']];
export default function ContentTab({ ctx }) {
  const { role } = ctx, [sub, setSub] = useState('prsh');
  const cur = role === 'sub_gabbai' ? 'ann' : sub; // sub-gabbai: announcements only
  return (
    <>
      {role !== 'sub_gabbai' && <div className="pills">{SUBS.map(([k, l]) => <button key={k} className={`opt ${cur === k ? 'on' : ''}`} onClick={() => setSub(k)}>{l}</button>)}</div>}
      {cur === 'prsh' && <Parsha {...ctx} />}{cur === 'pr' && <Prayers {...ctx} />}{cur === 'les' && <Lessons {...ctx} />}
      {cur === 'ann' && <><Announcements {...ctx} />{role !== 'sub_gabbai' && <Halacha {...ctx} />}</>}
      {cur === 'mem' && <><Memorials {...ctx} /><Refuah {...ctx} /></>}
    </>);
}

const NUSACH = { ashkenaz: 'אשכנז', sefard: 'ספרד', edot_hamizrach: 'עדות המזרח' };
function Parsha({ st, set, syn }) {
  return (
    <Card title="📜 פרשת שבוע והפטרה">
      <Switch label="הצג פרשה במסך" on={st.vis?.pr !== false} onChange={(v) => set('vis.pr', v)} />
      <Switch label="הצג בסרגל הרץ (Ticker)" on={st.tkParsha} onChange={(v) => set('tkParsha', v)} />
      <label>זיהוי הפרשה</label>
      <div className="row">{[['auto', 'אוטומטי'], ['manual', 'ידני']].map(([k, l]) => <button key={k} className={`opt ${st.pMode === k ? 'on' : ''}`} onClick={() => set('pMode', k)}>{l}</button>)}</div>
      <label>שם פרשה / אירוע (במצב ידני)</label><TextIn value={st.pTitle} onSave={(v) => set('pTitle', v)} placeholder="פרשת בראשית" />
      <label>כותרת משנה</label><TextIn value={st.pSub} onSave={(v) => set('pSub', v)} placeholder="שבת חתן" />
      <Switch label="להציג גם כשקופית בקרוסלה" on={st.pSlide} onChange={(v) => set('pSlide', v)} />
      <hr style={{ border: 0, borderTop: '1px solid var(--ln)', margin: '12px 0' }} />
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>ההפטרה מזוהה אוטומטית לפי הנוסח שהוגדר בהגדרות מערכת ({NUSACH[syn.nusach] || 'אשכנז'}), בלי מספרי פסוקים.</div>
      <Switch label="הצג הפטרה במסך" on={st.hfShow} onChange={(v) => set('hfShow', v)} />
      <label>עריכת הפטרה ידנית (שבתות מיוחדות, שבת חתן)</label><TextIn value={st.hfText} onSave={(v) => set('hfText', v)} placeholder="למשל: שמואל א׳" />
    </Card>);
}

const dowToDays = (a) => (a.length === 7 ? 'all' : a.length === 1 && a[0] === 6 ? 'shab' : a.length === 6 && !a.includes(6) ? 'week' : 'multi');
/** Multi-select weekday chips + quick presets (all weekdays / whole week). */
function DayPicker({ value, onChange }) {
  const v = value || [], tog = (i) => onChange(v.includes(i) ? v.filter((x) => x !== i) : [...v, i].sort());
  return (<div>
    <div className="pills" style={{ flexWrap: 'wrap', overflow: 'visible' }}>{LDAY_NAMES.map((n, i) => <button key={i} type="button" className={`opt ${v.includes(i) ? 'on' : ''}`} aria-pressed={v.includes(i)} onClick={() => tog(i)}>{n}</button>)}</div>
    <div className="row" style={{ marginTop: 4 }}><button type="button" className="b g" onClick={() => onChange([0, 1, 2, 3, 4, 5])}>כל ימי החול</button><button type="button" className="b g" onClick={() => onChange([0, 1, 2, 3, 4, 5, 6])}>כל השבוע</button><button type="button" className="b g" onClick={() => onChange([6])}>שבת בלבד</button><button type="button" className="b g" onClick={() => onChange([])}>נקה</button></div>
  </div>);
}
function Lessons({ sid, cols }) {
  const ed = useEditor({ title: '', rabbi: '', place: 'בית המדרש', days: 'week', dow: [0, 1, 2, 3, 4, 5], tmode: 'fixed', val: '20:00', showWa: true, screen: 'all' }), { f, setF } = ed;
  const save = () => { if (!f.title.trim() || !(f.dow || []).length) return; const g = { ...f, days: dowToDays(f.dow) }; ed.eid ? updItem(sid, 'lessons', ed.eid, g) : addItem(sid, 'lessons', { ...g, mode: 'block' }); ed.reset(); };
  const when = (l) => (l.tmode === 'fixed' ? l.val : `${l.tmode === 'sunset' ? 'שקיעה' : 'הנץ'} ${+l.val > 0 ? '+' : ''}${l.val}`);
  return (<>
    <div ref={ed.ref}><Card title={ed.eid ? 'עריכת שיעור' : '📚 שיעור תורה חדש'}>
      <label>שם השיעור</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="דף יומי" />
      <label>שם הרב</label><input value={f.rabbi} onChange={(e) => setF({ ...f, rabbi: e.target.value })} />
      <label>מיקום</label><input list="places" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} /><datalist id="places"><option value="היכל" /><option value="בית המדרש" /><option value="עזרת נשים" /><option value="לובי" /></datalist>
      <label>ימי השיעור (אפשר לבחור כמה)</label><DayPicker value={f.dow} onChange={(v) => setF({ ...f, dow: v })} />
      {!(f.dow || []).length && <div style={{ color: 'var(--bad)', fontSize: 13 }}>יש לבחור לפחות יום אחד.</div>}
      <div className="row">
        <div><label>זמן</label><select value={f.tmode} onChange={(e) => setF({ ...f, tmode: e.target.value })}><option value="fixed">קבוע</option><option value="sunset">יחסי לשקיעה</option><option value="sunrise">יחסי להנץ</option></select></div>
        <div><label>{f.tmode === 'fixed' ? 'שעה (08:00)' : 'דקות (למשל -20)'}</label><input style={{ direction: 'ltr' }} value={f.val} onChange={(e) => setF({ ...f, val: e.target.value })} /></div></div>
      <label>מסך</label><ScreenSel value={f.screen} onChange={(v) => setF({ ...f, screen: v })} />
      <Switch label="הצג בתמונת WhatsApp" on={f.showWa} onChange={(v) => setF({ ...f, showWa: v })} />
      <FormBtns ed={ed} onSave={save} label="הוסף שיעור" />
    </Card></div>
    {(cols.lessons || []).map((l) => (
      <Card key={l.id}><div className="row"><div style={{ flex: '3 1 200px' }}><b>{l.title}</b><div style={{ color: 'var(--mu)', fontSize: 14 }}>{[l.rabbi, l.place].filter(Boolean).join(' · ')}</div>
        <span className="tag">{lessonDaysLabel(l)}</span><span className="tag" style={{ direction: 'ltr' }}>{when(l)}</span>{l.showWa && <span className="tag ok">WhatsApp</span>}</div></div>
        <div className="row"><ModeSel value={modeVal(l)} onChange={(v) => updItem(sid, 'lessons', l.id, { mode: v })} /><TkChk on={l.ticker} onChange={(v) => updItem(sid, 'lessons', l.id, { ticker: v })} /><ScreenSel value={l.screen} onChange={(v) => updItem(sid, 'lessons', l.id, { screen: v })} />
          <Edit onClick={() => ed.load({ title: l.title, rabbi: l.rabbi || '', place: l.place || '', days: l.days || 'week', dow: lessonDays(l), tmode: l.tmode || 'fixed', val: l.val || '', showWa: !!l.showWa, screen: l.screen || 'all' }, l.id)} /><Del onClick={() => delItem(sid, 'lessons', l.id)} /></div></Card>))}
  </>);
}

function Halacha({ sid, st, set, cols }) {
  const ed = useEditor({ title: '', text: '', screen: 'all' }), { f, setF } = ed;
  const am = st.hl.autoMode ?? (st.hl.auto === false || st.hl.mode === 'off' ? 'off' : st.hl.mode === 'full' ? 'full' : 'block');
  const dh = { on: false, src: 'live_hy', mode: 'block', secs: 20, manual: '', ...(st.dh || {}) }, todayH = pickDaily({ src: isLive(dh.src) ? 'sefard' : dh.src, dayNum: rdOf(new Date(), 0), holidays: holNames(new Date(), false), dow: new Date().getDay() });
  const save = () => { if (!f.title.trim()) return; ed.eid ? updItem(sid, 'halacha', ed.eid, f) : addItem(sid, 'halacha', { ...f, mode: 'block' }); ed.reset(); };
  return (<>
    <Card fold title="🤖 מנהגי היום – תזכורות בתפילה (אוטומטי / ידני)">
      <Switch label="הצגת הפס במסך" on={st.vis?.cu !== false} onChange={(v) => set('vis.cu', v)} />
      <div className="row">{[['auto', 'אוטומטי'], ['both', 'אוטומטי + ידני'], ['manual', 'ידני בלבד']].map(([k, l]) => <button key={k} className={`b ${(st.customs?.mode || 'auto') === k ? '' : 'g'}`} onClick={() => set('customs.mode', k)}>{l}</button>)}</div>
      <label>טקסט ידני (שורה לכל תזכורת)</label><TextIn area value={st.customs?.text} onSave={(v) => set('customs.text', v)} />
    </Card>
    <Card fold title='🤖 שקופית "מנהגי היום" (אוטומטית)'>
      <div className="row">{[['off', 'כבוי'], ['block', 'בלוק בקרוסלה'], ['full', 'מסך מלא']].map(([k, l]) => <button key={k} className={`b ${am === k ? '' : 'g'}`} onClick={() => set('hl.autoMode', k)}>{l}</button>)}</div>
    </Card>
    <Card fold title="🤖 הלכה יומית (אוטומטית מספריא / מאגר)">
      <Switch label="הפעל הלכה יומית אוטומטית" on={!!dh.on} onChange={(v) => set('dh.on', v)} />
      <label>מקור ההלכה</label>
      <select value={dh.src} onChange={(e) => set('dh.src', e.target.value)}>{Object.entries(DH_SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <label>אופן תצוגה</label>
      <div className="row">{[['off', 'כבוי'], ['block', 'בלוק בקרוסלה'], ['full', 'מסך מלא']].map(([k, l]) => <button key={k} className={`b ${dh.mode === k ? '' : 'g'}`} onClick={() => set('dh.mode', k)}>{l}</button>)}</div>
      <Range label="זמן תצוגת שקופית (בשניות)" min={10} max={60} value={dh.secs} onChange={(v) => set('dh.secs', v)} />
      <label>הלכה ייעודית להיום (רשות – אם ריק, תוצג ההלכה האוטומטית)</label>
      <TextIn area value={dh.manual} placeholder="הקלידו כאן הלכה מותאמת אישית" onSave={(v) => set('dh.manual', v)} />
      <div style={{ color: 'var(--mu)', fontSize: 13, whiteSpace: 'pre-line' }}><b>{isLive(dh.src) ? 'מקור חי מספריא – ההלכה נמשכת אוטומטית מדי יום. דוגמה ממאגר הגיבוי המובנה:' : 'ההלכה האוטומטית להיום:'}</b> {todayH.title}{'\n'}{todayH.content}{'\n'}<i>{todayH.source}</i></div>
      <div style={{ color: 'var(--mu)', fontSize: 12 }}>ההלכה מתחלפת אוטומטית בכל יום. מומלץ שרב בית הכנסת יעבור על מאגר ההלכות המובנה.</div>
    </Card>
    <div ref={ed.ref}><Card title={ed.eid ? 'עריכת הלכה' : '✍️ הלכה ידנית חדשה'}>
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
    {role !== 'sub_gabbai' && (feat('runningTicker')
      ? <Card title="📣 סרגל עדכונים נע (תוכן)"><TextIn value={st.tkText} onSave={(v) => set('tkText', v)} placeholder="טקסט שיגלול בתחתית המסך" /><label>מסך</label><ScreenSel value={st.tkScreen} onChange={(v) => set('tkScreen', v)} /><Switch label="הצגה" on={st.vis?.tk !== false} onChange={(v) => set('vis.tk', v)} /></Card>
      : <Lock title="סרגל עדכונים נע" />)}
    <div ref={ed.ref}><Card title={ed.eid ? 'עריכת הודעה' : '✍️ הודעה ידנית חדשה'}>
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
        <div className="row"><ModeSel value={modeVal(a)} onChange={(v) => updItem(sid, 'announcements', a.id, { mode: v })} /><TkChk on={a.ticker} onChange={(v) => updItem(sid, 'announcements', a.id, { ticker: v })} />
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
    <Card title="רכיב ההנצחה">
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>כותרת הבלוק: 🕯 לעילוי נשמת. ביום הפטירה העברי השם מוצג אוטומטית.</div>
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
      <div className="row"><TkChk on={m.ticker} onChange={(v) => updItem(sid, 'memorials', m.id, { ticker: v })} /><ScreenSel value={m.screen} onChange={(v) => updItem(sid, 'memorials', m.id, { screen: v })} />
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
    <Card title="🏥 רפואה שלמה">
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

const DAYS = PDAYS;
function Prayers({ sid, cols, st, set, syn }) {
  const [open, setOpen] = useState(null);
  const oe = useEditor({ prayerId: '', kind: 'rc', time: '06:00', day: 1, month: 'Tishri' }), o = oe.f, setO = oe.setF;
  const pr = sortPrayers(cols.prayers || []);
  const [drag, setDrag] = useState(null);
  const moveTo = async (from, to) => { if (from === to || to < 0 || to >= pr.length) return; const a = pr.slice(); const [x] = a.splice(from, 1); a.splice(to, 0, x); await Promise.all(a.map((r, i) => (r.order === i + 1 ? null : updItem(sid, 'prayers', r.id, { order: i + 1 })))); };
  const saveOv = () => { if (!o.prayerId) return; oe.eid ? updItem(sid, 'overrides', oe.eid, o) : addItem(sid, 'overrides', o); oe.reset(); };
  return (<>
    <p style={{ color: 'var(--mu)', fontSize: 14 }}>זמן קבוע (06:15) או יחסי לשקיעה/הנץ בדקות (למשל -20). מחושב בדקה מדויקת לפי המיקום, ללא עיגול. לכל שורה אפשר לסמן אם להציג אותה בסרגל הכותרת העליון ו/או במסך המלא של זמני התפילות.</p>
    <Card title="⏰ אופן הצגת זמני התפילות">
      <label>שקופית זמני תפילות</label>
      <select value={st.ptAll?.mode === 'full' ? 'popup' : st.ptAll?.mode || 'off'} onChange={(e) => set('ptAll.mode', e.target.value)}><option value="off">כבוי – זמני התפילות בסרגל העליון בלבד</option><option value="block">בלוק בקרוסלה – כל תפילות היום יחד</option><option value="popup">מסך מלא – מגילת קלף מלכותית (כל תפילות היום)</option></select>
      <Range label="זמן תצוגה לשקופית (בשניות)" min={1} max={30} value={st.ptAll?.secs || 10} onChange={(v) => set('ptAll.secs', v)} />
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>הזמן חל על כל שקופיות התפילות. סימון ☑ ״סרגל עליון״ / ☑ ״מסך מלא״ נעשה בכל תפילה למטה. אופן הסרגלים (קבוע/רץ) – בלשונית ״עיצוב ותצוגה״.</div>
    </Card>
    {pr.map((r, ri) => (
      <div key={r.id} draggable onDragStart={() => setDrag(ri)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) moveTo(drag, ri); setDrag(null); }} style={drag === ri ? { opacity: 0.5 } : undefined}>
      <Card>
        <div className="row"><span title="גרור לשינוי סדר" style={{ cursor: 'grab', flex: '0 0 auto' }}>⠿</span><button className="b g" style={{ flex: '0 0 auto', padding: '4px 8px' }} disabled={ri === 0} onClick={() => moveTo(ri, ri - 1)}>⬆️</button><button className="b g" style={{ flex: '0 0 auto', padding: '4px 8px' }} disabled={ri === pr.length - 1} onClick={() => moveTo(ri, ri + 1)}>⬇️</button><span className="tag">{ri + 1}</span><b style={{ flex: '2 1 120px' }}>{r.name}</b><span className="tag">{r.dow?.length ? r.dow.map((i) => LDAY_NAMES[i]).join(' · ') : DAYS[pdayOf(r)]}</span><span style={{ direction: 'ltr' }}>{r.mode === 'fixed' ? r.val : `${r.mode === 'sunset' ? 'שקיעה' : 'הנץ'} ${+r.val > 0 ? '+' : ''}${r.val}`}</span>{r.note && <small style={{ color: 'var(--mu)' }}>{r.note}</small>}</div>
        <div className="row"><label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, flex: '0 0 auto' }}><input type="checkbox" style={{ width: 'auto' }} checked={r.bar ?? (r.show ?? 'bar') === 'bar'} onChange={(e) => updItem(sid, 'prayers', r.id, { bar: e.target.checked })} />סרגל עליון</label><label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, flex: '0 0 auto' }}><input type="checkbox" style={{ width: 'auto' }} checked={['block', 'full'].includes(r.show)} onChange={(e) => updItem(sid, 'prayers', r.id, { show: e.target.checked ? 'full' : 'bar' })} />מסך מלא</label><ScreenSel value={r.screen} onChange={(v) => updItem(sid, 'prayers', r.id, { screen: v })} />
          <Edit on={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)} /><Del onClick={() => delItem(sid, 'prayers', r.id)} /></div>
        {open === r.id && (
          <div className="row">
            <TextIn value={r.name} onSave={(v) => updItem(sid, 'prayers', r.id, { name: v })} />
            <select value={r.mode} onChange={(e) => updItem(sid, 'prayers', r.id, { mode: e.target.value })}><option value="fixed">קבוע</option><option value="sunset">משקיעה</option><option value="sunrise">מהנץ</option></select>
            <TextIn value={r.val} style={{ direction: 'ltr' }} onSave={(v) => updItem(sid, 'prayers', r.id, { val: v })} />
            <div style={{ flex: '1 1 100%' }}><label>סוג יום</label><select value={pdayOf(r)} onChange={(e) => updItem(sid, 'prayers', r.id, { days: e.target.value })}>{Object.entries(DAYS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <label style={{ marginTop: 6 }}>או ימים ספציפיים בשבוע (אופציונלי – גובר על סוג היום)</label>
              <DayPicker value={r.dow || []} onChange={(v) => updItem(sid, 'prayers', r.id, { dow: v })} /></div>
            <TextIn value={r.note} placeholder="הערה (רשות)" onSave={(v) => updItem(sid, 'prayers', r.id, { note: v })} />
          </div>)}
      </Card></div>))}
    <button className="b" onClick={async () => { const d = await addItem(sid, 'prayers', { order: pr.length + 1, name: 'תפילה חדשה', mode: 'fixed', val: '12:00', days: 'week', note: '', screen: 'all', show: 'bar', bar: true }); setOpen(d.id); }}>+ הוסף תפילה</button>
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

