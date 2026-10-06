import { PLAN_PRESETS } from './types';
// מסמך בית כנסת חדש (נוצר ע"י סופר-אדמין)
export const newSynagogue = (id, name) => ({
  id, name, planTier: 'pro', maxScreens: PLAN_PRESETS.pro.maxScreens, features: { ...PLAN_PRESETS.pro.features },
  subscriptionStatus: 'trial', validUntil: null,
  location: { city: 'ירושלים', street: '', lat: 31.7683, lng: 35.2137, elevation: 750 },
  config: { layout: '1', theme: 'gold', zoom: 1, anim: 'fade', candle: 30, shma: 'gra', pMode: 'auto', pSlide: false, pTitle: '', pSub: '', title: '',
    donTitle: '', donSub: '', pay: '', qs: 100, side: 32, cuMode: 'auto', cuText: '', vis: {}, bk: {}, cf: {}, ipp: {}, hl: { mode: 'block', auto: true }, tkText: '', accent: '', bg: '' },
  content: { ann: [], mem: [], rf: [], hli: [], po: [], plans: [],
    pr: [
      { id: 1, name: 'שחרית', mode: 'fixed', val: '06:15', days: 'week' },
      { id: 2, name: 'מנחה', mode: 'sunset', val: '-20', days: 'week' },
      { id: 3, name: 'ערבית', mode: 'sunset', val: '25', days: 'week' },
      { id: 4, name: 'שחרית שבת', mode: 'fixed', val: '08:30', days: 'shab' },
      { id: 5, name: 'מנחה שבת', mode: 'sunset', val: '-45', days: 'shab' },
    ] },
});
export const newOps = () => ({ org: { name: '', ngo: '', s46: '', prov: 'nedarim' }, members: [], rcpts: [], rc: 0, don: [], ex: [],
  bud: { 'חשמל': 6000, 'מים': 1800, 'אינטרנט': 1200, 'ניקיון': 4800, 'ספרים': 2000, 'אחר': 2000 },
  inv: [{ id: 1, name: 'סידורים', qty: 40, min: 10 }, { id: 2, name: 'חומשים', qty: 25, min: 8 }, { id: 3, name: 'נרות', qty: 30, min: 10 }, { id: 4, name: 'כוסות חד-פעמיות', qty: 200, min: 60 }, { id: 5, name: 'מוצרי ניקיון', qty: 12, min: 4 }] });
export const cfOf = (config, k) => ({ font: 'david', size: 18, secs: 10, ...((config.cf || {})[k] || {}) });
export const FONTS = { david: "David,'David Libre',serif", arial: "Arial,Helvetica,sans-serif" };
export const cfgOf = (s) => { const d = newSynagogue('', '').config, c = s.config || {}; return { ...d, ...c, hl: { ...d.hl, ...(c.hl || {}) } }; };
