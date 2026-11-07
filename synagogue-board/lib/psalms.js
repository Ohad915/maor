import { HDate } from '@hebcal/core';
import PSALMS from './psalms.json'; // 150 chapters, full niqqud (Westminster Leningrad Codex via Open Scriptures Hebrew Bible, CC BY 4.0); bundled -> works offline
import { gem, nowAbs } from './hebrew';

export const PSALMS_TEXT = PSALMS;
export const PS_DEFAULT = { on: false, mode: 'auto', manualChapter: 1, dedicationText: '', duration: 15, customTitle: '', customText: '', screen: 'all', show: 'full', pace: 'chapter', every: 1 };
/** traditional monthly cycle: [from, to] chapter per Hebrew day of the month (1-30); 119 is split in two (days 25/26) */
const CYCLE = [[1, 9], [10, 17], [18, 22], [23, 28], [29, 34], [35, 38], [39, 43], [44, 48], [49, 54], [55, 59], [60, 65], [66, 68], [69, 71], [72, 76], [77, 78], [79, 82], [83, 87], [88, 89], [90, 96], [97, 103], [104, 105], [106, 107], [108, 112], [113, 118], [119, 119, 1], [119, 119, 2], [120, 134], [135, 139], [140, 144], [145, 150]];
const hadar = (n) => 'פרק ' + gem(n);
const letters = (s) => s.replace(/[֑-ׇ]/g, '').length;

/** the chapters of today's portion {from,to,half} - automatic from the Hebrew day of the month (29-day months: day 29 also reads day 30's portion) */
export function psalmsOfDay(h, abs) {
  const d = Math.min(30, Math.max(1, h.d)), c = CYCLE[d - 1];
  let to = c[1];
  const lastDay = abs != null && new HDate(abs + 1).getDate() === 1;
  if (d === 29 && lastDay) to = 150;
  return { from: c[0], to, half: c[2] || 0, day: d };
}

/** split verses into readable pages (~PAGE letters each); 119 by halves when asked */
function pagesOfChapter(n, half, PAGE) {
  const vs = PSALMS[n - 1] || [], lo = half === 1 ? 0 : half === 2 ? 96 : 0, hi = half === 1 ? 96 : vs.length;
  const out = []; let cur = [], len = 0;
  for (let i = lo; i < hi; i++) {
    const L = letters(vs[i]);
    if (cur.length && len + L > PAGE) { out.push(cur); cur = []; len = 0; }
    cur.push([i + 1, vs[i]]); len += L;
  }
  if (cur.length) out.push(cur);
  return out.map((v, i, a) => ({ title: hadar(n), range: a.length > 1 || half ? (v[0][0] === v[v.length - 1][0] ? `פסוק ${gem(v[0][0])}` : `פסוקים ${gem(v[0][0])}–${gem(v[v.length - 1][0])}`) : '', v, chapter: n, i, of: a.length }));
}

/** pages of the slide for a config (mode auto | manual | custom) */
export function psalmsPages(cfg, h, abs, PAGE = 520) {
  const c = { ...PS_DEFAULT, ...(cfg || {}) };
  if (c.mode === 'custom') {
    const body = String(c.customText || '').split(/\n+/).map((x) => x.trim()).filter(Boolean), out = []; let cur = [], len = 0;
    body.forEach((t) => { const L = letters(t); if (cur.length && len + L > PAGE) { out.push(cur); cur = []; len = 0; } cur.push([0, t]); len += L; });
    if (cur.length) out.push(cur);
    return out.map((v, i, a) => ({ title: c.customTitle || 'תהילים', range: a.length > 1 ? `${i + 1}/${a.length}` : '', v, i, of: a.length, custom: true }));
  }
  if (c.mode === 'manual') return pagesOfChapter(Math.min(150, Math.max(1, +c.manualChapter || 1)), 0, PAGE);
  const p = psalmsOfDay(h, abs), out = [];
  for (let n = p.from; n <= p.to; n++) out.push(...pagesOfChapter(n, p.half, PAGE));
  return out;
}
export const psalmsSummary = (cfg, h, abs) => {
  const c = { ...PS_DEFAULT, ...(cfg || {}) };
  if (c.mode === 'custom') return c.customTitle || 'טקסט מותאם';
  if (c.mode === 'manual') return hadar(+c.manualChapter || 1);
  const p = psalmsOfDay(h, abs);
  return `יום ${gem(p.day)} בחודש: ${p.from === p.to ? hadar(p.from) : `פרקים ${gem(p.from)}–${gem(p.to)}`}${p.half ? (p.half === 1 ? ' (א׳–צ״ו)' : ' (צ״ז–קע״ו)') : ''}`;
};
