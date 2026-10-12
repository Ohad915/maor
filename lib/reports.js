const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ils = (n) => (+n || 0).toLocaleString('he-IL') + ' ₪';
const day = (ms) => (ms ? new Date(ms).toLocaleDateString('he-IL') : '—');
const iso = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');
const CSS = '<style>table{width:100%;border-collapse:collapse;margin:6px 0 14px}th,td{border:1px solid #aaa;padding:5px 8px;text-align:right;vertical-align:top}th{background:#eee}h1{margin:0 0 2px;font-size:24px}h2{margin:16px 0 2px;font-size:17px;border-bottom:2px solid #c9a94a}.tot td{font-weight:700;background:#f6f1de}.sub{color:#555;margin-bottom:8px}</style>';
const table = (head, rows, foot) => `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}">אין נתונים</td></tr>`}${foot ? `<tr class="tot">${foot.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>` : ''}</table>`;

export function budgetReportHtml({ name, month, expenses, receipts, donations, budget }) {
  const year = month.slice(0, 4), inM = (d) => (d || '').startsWith(month), inY = (d) => (d || '').startsWith(year);
  const income = [
    ...receipts.filter((r) => r.kind?.startsWith('dues') && inM(r.date)).map((r) => ({ d: r.date, t: 'דמי חבר', n: r.name, a: r.amount })),
    ...donations.filter((x) => inM(x.date)).map((x) => ({ d: x.date, t: 'תרומה', n: x.name, a: x.amount })),
  ].sort((a, b) => (a.d < b.d ? -1 : 1));
  const exp = expenses.filter((e) => inM(e.date)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const sIn = income.reduce((a, x) => a + x.a, 0), sEx = exp.reduce((a, x) => a + x.amount, 0);
  const cats = [...new Set([...Object.keys(budget || {}), ...expenses.map((e) => e.cat)])];
  const yr = (c) => expenses.filter((e) => inY(e.date) && e.cat === c).reduce((a, e) => a + e.amount, 0), mo = (c) => exp.filter((e) => e.cat === c).reduce((a, e) => a + e.amount, 0);
  return `${CSS}<h1>דוח תקציב · ${esc(name)}</h1><div class="sub">חודש ${esc(month)} · הופק ב-${new Date().toLocaleDateString('he-IL')}</div>
<h2>סיכום</h2>${table(['הכנסות', 'הוצאות', 'יתרה'], [[ils(sIn), ils(sEx), ils(sIn - sEx)]])}
<h2>הכנסות</h2>${table(['תאריך', 'סוג', 'שם', 'סכום'], income.map((x) => [iso(x.d), x.t, x.n, ils(x.a)]), ['', '', 'סה״כ', ils(sIn)])}
<h2>הוצאות</h2>${table(['תאריך', 'קטגוריה', 'הערה', 'סכום'], exp.map((e) => [iso(e.date), e.cat, e.note, ils(e.amount)]), ['', '', 'סה״כ', ils(sEx)])}
<h2>פילוח לפי קטגוריות</h2>${table(['קטגוריה', 'החודש', 'תקציב חודשי', `מצטבר ${year}`, 'תקציב שנתי'], cats.map((c) => [c, ils(mo(c)), ils((budget?.[c] || 0) / 12), ils(yr(c)), ils(budget?.[c] || 0)]))}`;
}

export function maintenanceReportHtml({ name, tickets, inventory }) {
  const ST = ['חדש', 'בטיפול', 'טופל'], today = new Date().toISOString().slice(0, 10);
  const up = [...tickets.filter((t) => t.nextCheck).map((t) => ({ d: t.nextCheck, n: 'משימה: ' + t.title })), ...inventory.filter((i) => i.nextCheck).map((i) => ({ d: i.nextCheck, n: 'ציוד: ' + i.name }))]
    .filter((x) => x.d >= today).sort((a, b) => (a.d < b.d ? -1 : 1));
  return `${CSS}<h1>דוח תחזוקה וציוד · ${esc(name)}</h1><div class="sub">הופק ב-${new Date().toLocaleDateString('he-IL')}</div>
<h2>משימות ותקלות</h2>${table(['תקלה / משימה', 'מיקום', 'סטטוס', 'נפתח', 'בדיקה קרובה'], tickets.map((t) => [t.title, t.loc, ST[t.st] || '', day(t.createdAt), iso(t.nextCheck)]))}
<h2>מלאי וציוד</h2>${table(['פריט', 'כמות', 'מינימום', 'מצב', 'בדיקה קרובה'], inventory.map((i) => [i.name, i.qty, i.min, i.qty <= i.min ? 'עומד להסתיים' : 'תקין', iso(i.nextCheck)]))}
<h2>בדיקות ותחזוקה קרובות</h2>${table(['תאריך', 'פריט'], up.map((x) => [iso(x.d), x.n]))}`;
}
