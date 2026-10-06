// גודל יחסי (50% = Auto) וצבעים ייעודיים לכל קוביה
export const BLOCKS = [['cr','כותרת עליונה'],['hd','תאריך וזמני היום'],['pr','פרשת השבוע'],['cu','מנהגי היום / תזכורות'],['mn','הודעות והלכה (פאנל מרכזי)'],['yz','לעילוי נשמת'],['rf','רפואה שלמה'],['qr','קוד QR לתרומות'],['pb','זמני תפילות']];
const g = (cfg, k) => (cfg.bk || {})[k] || {};
export const bk = (cfg, k) => { const b = g(cfg, k); return { w: (b.w ?? 50) / 50, h: (b.h ?? 50) / 50 }; };
// t: x = בלוק ברוחב מלא | s = קוביית צד | r = קוביה בשורה
export function bs(cfg, k, t, base) {
  const { w, h } = bk(cfg, k); let o = '';
  if (t === 'x') { if (w !== 1) o += `width:${Math.min(w, 1) * 100}%;align-self:center;`; if (h !== 1) o += `height:calc(${base * h}*var(--u));flex:none;overflow:hidden;`; }
  else if (t === 's') { o += `flex:${base * h};`; if (w < 1) o += `width:${w * 100}%;align-self:center;`; }
  else if (t === 'r') { o += `flex:${base * w};`; if (h < 1) o += `height:${h * 100}%;align-self:center;`; }
  return o;
}
export const cs = (cfg, k) => { const b = g(cfg, k); return (b.bg ? `background:${b.bg};` : '') + (b.bd ? `border-color:${b.bd};` : '') + (b.tx ? `color:${b.tx};--dac:${b.tx};` : ''); };
export const sty = (str) => Object.fromEntries(str.split(';').filter(Boolean).map((p) => { const i = p.indexOf(':'); const k = p.slice(0, i).trim(); return [k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), p.slice(i + 1).trim()]; }));
