'use client';
import { useState } from 'react';

/** Opens the TV display in a new tab (full URL built from the current origin) and copies the address with one click. */
export default function ScreenLink({ sid, screen = 'main-hall', label = '👁️ פתח מסך תצוגה בלשונית חדשה' }) {
  const [c, setC] = useState(false);
  const url = () => `${window.location.origin}/display?s=${encodeURIComponent(sid)}&screen=${encodeURIComponent(screen)}`;
  const open = () => window.open(url(), '_blank', 'noopener,noreferrer');
  const copy = async () => { try { await navigator.clipboard.writeText(url()); setC(true); setTimeout(() => setC(false), 1500); } catch { window.prompt('העתיקו את הכתובת:', url()); } };
  return (<span className="row" style={{ flex: '0 0 auto', gap: 6 }}>
    <button type="button" className="b" style={{ padding: '4px 10px', fontSize: 13 }} onClick={open}>{label}</button>
    <button type="button" className="b g" style={{ padding: '4px 10px', fontSize: 13 }} title="העתק כתובת מלאה" onClick={copy}>{c ? 'הועתק ✓' : '📋 העתק'}</button>
  </span>);
}
