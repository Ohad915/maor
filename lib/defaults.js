/** Soft fallback for the TV screen when Firebase is unreachable/empty and nothing is cached yet: shows a calm demo board instead of an error. */
export const DEMO_PRAYERS = [
  { id: 'd1', name: 'שחרית', mode: 'fixed', val: '06:15', days: 'week', show: 'bar', screen: 'all' },
  { id: 'd2', name: 'מנחה', mode: 'sunset', val: '-20', days: 'week', show: 'bar', screen: 'all' },
  { id: 'd3', name: 'ערבית', mode: 'sunset', val: '25', days: 'week', show: 'bar', screen: 'all' },
  { id: 'd4', name: 'מנחה וקבלת שבת', mode: 'sunset', val: '-20', days: 'fri', show: 'bar', screen: 'all' },
  { id: 'd5', name: 'שחרית', mode: 'fixed', val: '08:30', days: 'shab', show: 'bar', screen: 'all' },
  { id: 'd6', name: 'מנחה', mode: 'sunset', val: '-45', days: 'shab', show: 'bar', screen: 'all' },
];
export const DEMO_SYN = { id: 'demo', name: 'בית הכנסת', nusach: 'sefard', location: { lat: 31.7683, lng: 35.2137, elevation: 750, city: 'ירושלים' }, settings: {}, plan: { planTier: 'basic', maxScreens: 1, features: {} } };
