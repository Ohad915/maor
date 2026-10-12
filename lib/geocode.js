// City-level fallback if the geocoding service is unreachable.
const CITY = { 'ירושלים': [31.7683, 35.2137], 'תלאביב': [32.0853, 34.7818], 'בניברק': [32.0809, 34.8338], 'חיפה': [32.794, 34.9896], 'פתחתקווה': [32.0841, 34.8878],
  'ראשוןלציון': [31.973, 34.7925], 'אשדוד': [31.8014, 34.6553], 'נתניה': [32.3215, 34.8532], 'בארשבע': [31.253, 34.7915], 'ביתשמש': [31.7306, 34.9886],
  'מודיעיןעילית': [31.9402, 35.0433], 'אלעד': [32.0522, 34.9508], 'רמתגן': [32.0684, 34.8248], 'חולון': [32.0158, 34.7874], 'רחובות': [31.8928, 34.8113],
  'אשקלון': [31.6688, 34.5743], 'טבריה': [32.7959, 35.5312], 'צפת': [32.9646, 35.496], 'הרצליה': [32.1663, 34.8436], 'אילת': [29.5577, 34.9519] };

/** Nominatim → {lat,lng,elevation,source}. Elevation via open-meteo (optional, 0 on failure). */
export async function geocode(city, street) {
  const q = encodeURIComponent(`${street || ''} ${city || ''} ישראל`.trim());
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=he`);
    const j = await r.json();
    if (j[0]) {
      const lat = +j[0].lat, lng = +j[0].lon;
      let elevation = 0;
      try { const e = await (await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)).json(); elevation = Math.round(e.elevation?.[0] || 0); } catch {}
      return { lat, lng, elevation, source: 'כתובת מלאה (OpenStreetMap)' };
    }
  } catch {}
  const k = CITY[(city || '').replace(/[\s"'׳״־-]/g, '')];
  return k ? { lat: k[0], lng: k[1], elevation: 0, source: 'מרכז העיר (טבלה מובנית)' } : null;
}
