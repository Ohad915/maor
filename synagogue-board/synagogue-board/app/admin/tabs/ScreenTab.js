'use client';
import { useState } from 'react';
import { addItem, delItem, updItem } from '@/lib/db';
import { LAYOUTS, SCREEN_NAMES } from '@/lib/types';
import { gem, hebOf, monthName, refuahOn, resolveSpan } from '@/lib/hebrew';
import { Card, DisplayCfg, HebPick, Lock, Range, ScreenSel, Switch, TextIn, parseY } from '../components/UI';
import BlockDesignAccordion from '../components/BlockDesignAccordion';

const SUBS = [['prsh', 'פרשת שבוע'], ['hal', 'הלכה יומית'], ['ann', 'הודעות ואירועים'], ['mem', 'הנצחות ולעילוי נשמת'], ['rf', '🏥 רפואה שלמה'], ['pr', 'זמני תפילות'], ['dsg', 'עיצוב']];
const Del = ({ onClick }) => <button className="b d" style={{ flex: '0 0 auto' }} onClick={onClick}>מחק</button>;

export default function ScreenTab({ ctx }) {
  const { sid, st, cols, role, feat } = ctx;
  const [sub, setSub] = useState('prsh');
  const cur = role === 'sub_gabbai' ? 'ann' : sub;
  const P = { ...ctx, st };
  return (
    <>
      <h2 style={{ margin: '0 0 8px' }}>ניהול המסך הראשי</h2>
      {role !== 'sub_gabbai' && <div className="row" style={{ marginBottom: 10, gap: 6 }}>{SUBS.map(([k, l]) => <button key={k} className={`b ${cur === k ? '' : 'g'}`} style={{ flex: '0 0 auto', padding: '8px 12px' }} onClick={() => setSub(k)}>{l}</button>)}</div>}
      {cur === 'prsh' && <Parsha {...P} />}{cur === 'hal' && <Halacha {...P} />}{cur === 'ann' && <Announcements {...P} />}
      {cur === 'mem' && <Memorials {...P} />}{cur === 'rf' && <Refuah {...P} />}{cur === 'pr' && <Prayers {...P} />}{cur === 'dsg' && <Design {...P} />}
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
  const [t, setT] = useState(''), [x, setX] = useState(''), [sc, setSc] = useState('all');
  return (<>
    <DisplayCfg st={st} set={set} k="hal" />
    <Card title="מנהגי היום / תזכורות בתפילה">
      <Switch label="הצגת הפס במסך" on={st.vis?.cu !== false} onChange={(v) => set('vis.cu', v)} />
      <div className="row">{[['auto', 'אוטומטי'], ['both', 'אוטומטי + ידני'], ['manual', 'ידני בלבד']].map(([k, l]) => <button key={k} className={`b ${(st.customs?.mode || 'auto') === k ? '' : 'g'}`} onClick={() => set('customs.mode', k)}>{l}</button>)}</div>
      <label>טקסט ידני (שורה לכל תזכורת)</label><TextIn area value={st.customs?.text} onSave={(v) => set('customs.text', v)} />
    </Card>
    <Card title="שקופיות הלכה">
      <div className="row">{[['off', 'כבוי'], ['block', 'בלוק בקרוסלה'], ['full', 'מסך מלא']].map(([k, l]) => <button key={k} className={`b ${st.hl.mode === k ? '' : 'g'}`} onClick={() => set('hl.mode', k)}>{l}</button>)}</div>
      <Switch label='שקופית "מנהגי היום" אוטומטית' on={st.hl.auto} onChange={(v) => set('hl.auto', v)} />
      <Range label="שורות בעמוד (טקסט ארוך מתחלק לעמודים)" min={2} max={14} value={st.lpp || 6} onChange={(v) => set('lpp', v)} />
      <label>כותרת</label><input value={t} onChange={(e) => setT(e.target.value)} /><label>תוכן (ירידות שורה נשמרות)</label><textarea value={x} onChange={(e) => setX(e.target.value)} /><label>מסך</label><ScreenSel value={sc} onChange={setSc} />
      <button className="b" onClick={() => { if (t.trim()) { addItem(sid, 'halacha', { title: t, text: x, on: true, screen: sc }); setT(''); setX(''); } }}>הוסף</button>
    </Card>
    {(cols.halacha || []).map((i) => <Card key={i.id} className="row"><div style={{ flex: '3 1 200px' }}><b>{i.title}</b><div style={{ color: 'var(--mu)', fontSize: 14 }}>{i.text}</div></div>
      <ScreenSel value={i.screen} onChange={(v) => updItem(sid, 'halacha', i.id, { screen: v })} /><label className="sw"><input type="checkbox" checked={!!i.on} onChange={(e) => updItem(sid, 'halacha', i.id, { on: e.target.checked })} /><i /></label><Del onClick={() => delItem(sid, 'halacha', i.id)} /></Card>)}
  </>);
}

function Announcements({ sid, st, set, cols, role, feat }) {
  const [f, setF] = useState({ title: '', content: '', screen: 'all', limited: false, from: { d: 1, m: 'Tishri' }, to: { d: 1, m: 'Tishri' } });
  return (<>
    {role !== 'sub_gabbai' && <DisplayCfg st={st} set={set} k="ann" />}
    {role !== 'sub_gabbai' && <Card><Range label="שורות בעמוד (טקסט ארוך מתחלק לעמודים)" min={2} max={14} value={st.lpp || 6} onChange={(v) => set('lpp', v)} /></Card>}
    {role !== 'sub_gabbai' && (feat('runningTicker')
      ? <Card title="סרגל עדכונים נע"><TextIn value={st.tkText} onSave={(v) => set('tkText', v)} placeholder="טקסט שיגלול בתחתית המסך" /><label>מסך</label><ScreenSel value={st.tkScreen} onChange={(v) => set('tkScreen', v)} /><Switch label="הצגה" on={st.vis?.tk !== false} onChange={(v) => set('vis.tk', v)} /></Card>
      : <Lock title="סרגל עדכונים נע" />)}
    <Card title="הודעה חדשה">
      <label>כותרת</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label>תוכן (ירידות שורה נשמרות)</label><textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
      <label>מסך</label><select value={f.screen} onChange={(e) => setF({ ...f, screen: e.target.value })}><option value="all">כל המסכים</option>{Object.entries(SCREEN_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <label><input type="checkbox" style={{ width: 'auto' }} checked={f.limited} onChange={(e) => setF({ ...f, limited: e.target.checked })} /> הגבל תוקף לפי תאריך עברי (חוזר מדי שנה)</label>
      {f.limited && <><label>מ- (יום וחודש עברי)</label><HebPick value={f.from} onChange={(v) => setF({ ...f, from: v })} /><label>עד</label><HebPick value={f.to} onChange={(v) => setF({ ...f, to: v })} /></>}
      <button className="b" onClick={() => { if (f.title.trim()) { addItem(sid, 'announcements', { ...f, on: true }); setF({ ...f, title: '', content: '' }); } }}>הוסף הודעה</button>
    </Card>
    {(cols.announcements || []).map((a) => (
      <Card key={a.id} className="row"><div style={{ flex: '3 1 200px' }}><b>{a.title}</b><div style={{ color: 'var(--mu)', fontSize: 14 }}>{a.content}</div>
        <span className="tag">{a.screen === 'all' ? 'כל המסכים' : SCREEN_NAMES[a.screen]}</span>{a.limited && <span className="tag">{gem(a.from.d)} {monthName(a.from.m)} – {gem(a.to.d)} {monthName(a.to.m)}</span>}</div>
        <label className="sw"><input type="checkbox" checked={!!a.on} onChange={(e) => updItem(sid, 'announcements', a.id, { on: e.target.checked })} /><i /></label><Del onClick={() => delItem(sid, 'announcements', a.id)} /></Card>))}
  </>);
}

function Memorials({ sid, st, set, cols, feat }) {
  const [f, setF] = useState({ name: '', desc: '', screen: 'all', gender: 'm', mode: 'y', d: 1, month: 'Tishri', y: '', from: { d: 1, m: 'Tishri' }, to: { d: 1, m: 'Tishri' } });
  const mems = cols.memorials || [], limited = mems.length >= 10 && !feat('unlimitedMemorials');
  const h = hebOf(new Date(), false);
  const add = () => {
    if (!f.name.trim()) return; const y = parseY(f.y);
    addItem(sid, 'memorials', { name: f.name, desc: f.desc, screen: f.screen, gender: f.gender, mode: f.mode, d: f.d, month: f.month, y, from: f.from, to: f.to });
    setF({ ...f, name: '', desc: '', y: '' });
  };
  return (<>
    <DisplayCfg st={st} set={set} k="mem" />
    <Card title="רכיב ההנצחה">
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>כותרת הבלוק: 🕯 לעילוי נשמת. ביום הפטירה העברי השם מוצג אוטומטית.</div>
      <Range label="שמות בעמוד" min={1} max={8} value={st.ipp?.yz || 3} onChange={(v) => set('ipp.yz', v)} />
      <Switch label="הצגת פינת ההנצחה" on={st.vis?.yz !== false} onChange={(v) => set('vis.yz', v)} />
      <Switch label="הקפצה בקרוסלה ביום הפטירה" on={st.vis?.memPop !== false} onChange={(v) => set('vis.memPop', v)} />
    </Card>
    {limited ? <Lock title="הנצחות ללא הגבלה (מעל 10)" /> : (
      <Card title="הנצחה חדשה">
        <label>שם הנפטר/ת</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label>הקדשה (רשות, ירידות שורה נשמרות)</label><textarea value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /><label>מסך</label><ScreenSel value={f.screen} onChange={(v) => setF({ ...f, screen: v })} />
        <div className="row"><div><label>מין</label><select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="m">זכר</option><option value="f">נקבה</option></select></div>
          <div><label>אופן הצגה</label><select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}><option value="y">ביום הפטירה העברי</option><option value="r">בטווח תאריכים עברי</option><option value="p">קבוע (ללא תאריך)</option></select></div></div>
        {f.mode === 'y' && <><label>תאריך פטירה (יום, חודש, שנה עברית רשות)</label><HebPick value={{ d: f.d, m: f.month }} onChange={(v) => setF({ ...f, d: v.d, month: v.m })} /><input placeholder="תשפ״ה או 5785" value={f.y} onChange={(e) => setF({ ...f, y: e.target.value })} /></>}
        {f.mode === 'r' && <><label>מ-</label><HebPick value={f.from} onChange={(v) => setF({ ...f, from: v })} /><label>עד</label><HebPick value={f.to} onChange={(v) => setF({ ...f, to: v })} /></>}
        <button className="b" onClick={add}>הוסף הנצחה</button>
      </Card>)}
    {mems.map((m) => <Card key={m.id} className="row"><div style={{ flex: '3 1 200px' }}><b>{m.name}</b>{m.desc && <small> {m.desc}</small>}
      <div style={{ color: 'var(--mu)' }}>{m.mode === 'p' ? 'הצגה קבועה' : m.mode === 'r' ? `בטווח ${gem(m.from.d)} ${monthName(m.from.m)} – ${gem(m.to.d)} ${monthName(m.to.m)}` : `${gem(m.d)} ב${monthName(m.month)}${m.y ? ' ' + gem(m.y % 1000) : ''}${m.y && h.y > m.y ? ` · ${h.y - m.y} שנים` : ''}`}</div></div><ScreenSel value={m.screen} onChange={(v) => updItem(sid, 'memorials', m.id, { screen: v })} /><Del onClick={() => delItem(sid, 'memorials', m.id)} /></Card>)}
  </>);
}

function Refuah({ sid, st, set, cols }) {
  const [f, setF] = useState({ name: '', note: '', screen: 'all', from: { d: 1, m: 'Tishri' }, to: { d: 30, m: 'Tishri' } });
  const h = hebOf(new Date(), false);
  const add = () => { if (!f.name.trim()) return; addItem(sid, 'refuah', { ...f, ...resolveSpan(f.from, f.to, h) }); setF({ ...f, name: '', note: '' }); };
  return (<>
    <DisplayCfg st={st} set={set} k="rf" />
    <Card title="🏥 רפואה שלמה">
      <Range label="שמות בעמוד" min={1} max={8} value={st.ipp?.rf || 3} onChange={(v) => set('ipp.rf', v)} />
      <Switch label="הצגת הבלוק במסך" on={st.vis?.rf !== false} onChange={(v) => set('vis.rf', v)} />
      <Switch label="הקפצה בקרוסלת ההודעות" on={st.vis?.rfPop !== false} onChange={(v) => set('vis.rfPop', v)} />
    </Card>
    <Card title="שם חדש">
      <label>שם החולה/ה (כולל שם האם)</label><input value={f.name} placeholder="פלוני בן פלונית" onChange={(e) => setF({ ...f, name: e.target.value })} />
      <label>בקשה / תפילה קצרה (רשות)</label><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /><label>מסך</label><ScreenSel value={f.screen} onChange={(v) => setF({ ...f, screen: v })} />
      <label>תוקף מ- (יום וחודש עברי)</label><HebPick value={f.from} onChange={(v) => setF({ ...f, from: v })} />
      <label>עד</label><HebPick value={f.to} onChange={(v) => setF({ ...f, to: v })} />
      <button className="b" onClick={add}>הוסף</button>
    </Card>
    {(cols.refuah || []).map((r) => { const on = refuahOn(r, h); return (
      <Card key={r.id} className="row"><div style={{ flex: '3 1 200px' }}><b>{r.name}</b>{r.note && <small> {r.note}</small>}<div style={{ color: 'var(--mu)', fontSize: 13 }}>{gem(r.from.d)} {monthName(r.from.m)} – {gem(r.to.d)} {monthName(r.to.m)}</div></div>
        <span className={`tag ${on ? 'ok' : ''}`}>{on ? 'פעיל' : 'לא פעיל / פג'}</span><ScreenSel value={r.screen} onChange={(v) => updItem(sid, 'refuah', r.id, { screen: v })} /><Del onClick={() => delItem(sid, 'refuah', r.id)} /></Card>); })}
  </>);
}

function Prayers({ sid, cols }) {
  const [o, setO] = useState({ prayerId: '', kind: 'rc', time: '06:00', day: 1, month: 'Tishri' });
  const pr = cols.prayers || [];
  return (<>
    <p style={{ color: 'var(--mu)', fontSize: 14 }}>זמן קבוע (06:15) או יחסי לשקיעה/הנץ בדקות (למשל -20). מחושב בדקה מדויקת לפי המיקום, ללא עיגול.</p>
    {pr.map((r) => (
      <Card key={r.id}><div className="row">
        <TextIn value={r.name} onSave={(v) => updItem(sid, 'prayers', r.id, { name: v })} />
        <select value={r.mode} onChange={(e) => updItem(sid, 'prayers', r.id, { mode: e.target.value })}><option value="fixed">קבוע</option><option value="sunset">משקיעה</option><option value="sunrise">מהנץ</option></select>
        <TextIn value={r.val} style={{ direction: 'ltr' }} onSave={(v) => updItem(sid, 'prayers', r.id, { val: v })} />
        <select value={r.days} onChange={(e) => updItem(sid, 'prayers', r.id, { days: e.target.value })}>{[['week', 'חול'], ['fri', 'ערב שבת'], ['shab', 'שבת/חג'], ['mots', 'מוצ״ש'], ['all', 'תמיד']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <TextIn value={r.note} placeholder="הערה (רשות)" onSave={(v) => updItem(sid, 'prayers', r.id, { note: v })} />
        <ScreenSel value={r.screen} onChange={(v) => updItem(sid, 'prayers', r.id, { screen: v })} /><Del onClick={() => delItem(sid, 'prayers', r.id)} /></div></Card>))}
    <button className="b" onClick={() => addItem(sid, 'prayers', { name: 'תפילה חדשה', mode: 'fixed', val: '12:00', days: 'week', note: '', screen: 'all' })}>+ הוסף תפילה</button>
    <h3 style={{ margin: '14px 0 6px' }}>דריסת זמן נקודתית</h3>
    <Card>
      <div className="row"><div><label>תפילה</label><select value={o.prayerId} onChange={(e) => setO({ ...o, prayerId: e.target.value })}><option value="">—</option>{pr.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
        <div><label>מתי</label><select value={o.kind} onChange={(e) => setO({ ...o, kind: e.target.value })}><option value="rc">ראש חודש</option><option value="h">תאריך עברי (שנתי)</option></select></div>
        <div><label>שעה</label><input type="time" value={o.time} onChange={(e) => setO({ ...o, time: e.target.value })} /></div></div>
      {o.kind === 'h' && <HebPick value={{ d: o.day, m: o.month }} onChange={(v) => setO({ ...o, day: v.d, month: v.m })} />}
      <button className="b" disabled={!o.prayerId} onClick={() => addItem(sid, 'overrides', o)}>הוסף דריסה</button>
    </Card>
    {(cols.overrides || []).map((x) => <Card key={x.id} className="row"><span style={{ flex: '3 1 160px' }}>{pr.find((r) => r.id === x.prayerId)?.name || '?'} ← <b>{x.time}</b> · {x.kind === 'rc' ? 'ראש חודש' : `${gem(x.day)} ${monthName(x.month)}`}</span><Del onClick={() => delItem(sid, 'overrides', x.id)} /></Card>)}
  </>);
}

function Design({ sid, st, set }) {
  const up = (file) => {
    if (!file) return; const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); set('bg', c.toDataURL('image/jpeg', 0.6)); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  };
  const Btns = ({ k, opts }) => <div className="row">{opts.map(([v, l]) => <button key={v} className={`b ${st[k] === v ? '' : 'g'}`} onClick={() => set(k, v)}>{l}</button>)}</div>;
  const V = [['cr', 'כותרת עליונה'], ['hd', 'פס התאריך העליון'], ['zm', 'סרגל זמני היום'], ['pr', 'פרשת השבוע'], ['cu', 'מנהגי היום / תזכורות'], ['yz', 'לעילוי נשמת'], ['rf', 'רפואה שלמה'], ['qr', 'פינת QR לתרומות'], ['tk', 'סרגל עדכונים נע'], ['frm', 'מסגרת ופינות זהב']];
  return (<>
    <Card title="כותרות"><label>כותרת עליונה (ריק = שם בית הכנסת)</label><TextIn value={st.title} onSave={(v) => set('title', v)} /></Card>
    <Card title="עיצוב מסך ראשי">
      <label>דגם פריסת מסך</label><select value={st.layout} onChange={(e) => set('layout', e.target.value)}>{LAYOUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <label>ערכת נושא</label><Btns k="theme" opts={[['gold', 'זהב מלכותי'], ['classic', 'שיש קלאסי'], ['modern', 'מודרני כהה']]} />
      <label>זום כללי למסך</label><Btns k="zoom" opts={[[1, 'רגיל'], [1.25, 'גדול'], [1.5, 'ענק']]} />
      <label>אפקט מעבר</label><Btns k="anim" opts={[['fade', 'דהייה'], ['slide', 'החלקה'], ['none', 'ללא']]} />
      <label>צבע מבטא</label><div className="row"><input type="color" value={st.accent || '#f2c85b'} onChange={(e) => set('accent', e.target.value)} />{st.accent && <button className="b g" onClick={() => set('accent', '')}>איפוס</button>}</div>
      <label>תמונת רקע</label><input type="file" accept="image/*" onChange={(e) => up(e.target.files[0])} />{st.bg && <button className="b d" onClick={() => set('bg', '')}>הסר תמונה</button>}
    </Card>
    <Card title="רכיבים גלויים">{V.map(([k, l]) => <Switch key={k} label={l} on={st.vis?.[k] !== false} onChange={(v) => set(`vis.${k}`, v)} />)}</Card>
    <Card title="רוחב עמודות הצד"><Range label="רוחב %" min={20} max={50} value={st.side} onChange={(v) => set('side', v)} /></Card>
    <BlockDesignAccordion st={st} set={set} sid={sid} />
  </>);
}
