/**
 * @typedef {'super_admin'|'gabbai'|'sub_gabbai'} Role
 * @typedef {'pending'|'approved'|'rejected'|'suspended'} UserStatus
 * @typedef {{uid:string,email:string,role:Role,status:UserStatus,synagogueId:string|null,createdAt:any}} UserDoc
 * @typedef {'basic'|'pro'|'premium'} PlanTier
 * @typedef {{planTier:PlanTier,maxScreens:number,features:{whatsappBot:boolean,customPaymentGateway:boolean,runningTicker:boolean,unlimitedMemorials:boolean},subscriptionStatus:'active'|'expired'|'trial',validUntil:string|null}} Plan
 * @typedef {{id:string,name:string,city:string,street:string,location:{lat:number,lng:number,elevation:number},nusach:string,plan:Plan,settings:object}} SynagogueConfig
 */
export const SCREENS = ['main-hall', 'women', 'lobby', 'beit-midrash'];
export const SCREEN_NAMES = { 'main-hall': 'היכל ראשי', women: 'עזרת נשים', lobby: 'לובי', 'beit-midrash': 'בית מדרש' };
export const FONTS = { david: "David,'David Libre',serif", arial: 'Arial,Helvetica,sans-serif' };
export const FONT_LABELS = { david: 'דוד (David)', arial: 'אריאל (Arial)' };
const all = (v) => ({ whatsappBot: v, customPaymentGateway: v, runningTicker: v, unlimitedMemorials: v });
export const PLAN_PRESETS = {
  basic: { maxScreens: 1, features: { ...all(false) } },
  pro: { maxScreens: 3, features: { whatsappBot: true, customPaymentGateway: true, runningTicker: true, unlimitedMemorials: false } },
  premium: { maxScreens: 99, features: { ...all(true) } },
};
export const defaultPlan = (tier = 'basic') => ({ planTier: tier, ...PLAN_PRESETS[tier], subscriptionStatus: 'trial', validUntil: null });
export const DEFAULT_SETTINGS = {
  theme: 'gold', layout: '1', frame: 'royal', cardStyle: 'clean', zoom: 1, anim: 'fade', accent: '', title: '', bg: '',
  pMode: 'auto', pTitle: '', pSub: '', pSlide: false,
  shma: 'gra', candle: 30, force: false, side: 32, qs: 100,
  donTitle: '', donSub: '', payUrl: '', tkText: '',
  zm: { profile: 'ashkenaz', shma: 'gra', tzeit: '8.5', rt: false, netzVisible: true }, hfShow: false, hfText: '', waParsha: true, waHaftara: true,
  vis: {}, cf: {}, blocks: {}, ipp: { yz: 3, rf: 3 },
  customs: { mode: 'auto', text: '' }, ptAll: { mode: 'off', secs: 10 }, hl: { mode: 'block', auto: true },
};
export const BLOCKS = [['cr', 'כותרת עליונה'], ['hd', 'תאריך וזמני היום'], ['pr', 'פרשת השבוע'], ['cu', 'מנהגי היום / תזכורות'],
  ['mn', 'הודעות והלכה (פאנל מרכזי)'], ['yz', 'לעילוי נשמת'], ['rf', 'רפואה שלמה'], ['qr', 'קוד QR לתרומות'], ['pb', 'זמני תפילות']];
export const LAYOUTS = [['1', 'דגם 1 · קלאסי מופרד'], ['2', 'דגם 2 · כותרת משולבת'], ['3', 'דגם 3 · סימטרי מלכותי'], ['4', 'דגם 4 · מודרני מורחב']];
export const ALL_SUBCOLS = ['announcements', 'memorials', 'refuah', 'halacha', 'prayers', 'overrides', 'members', 'receipts', 'donations', 'tickets', 'inventory', 'expenses', 'screens', 'private', 'lessons'];
export const DISPLAY_COLS = ['announcements', 'memorials', 'refuah', 'halacha', 'prayers', 'overrides', 'lessons'];
